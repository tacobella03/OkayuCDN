/* eslint-disable no-undef */

let SOCKET, DOMAIN, TOKEN = getCookie('token'), FILE_NAME;


// get identity on load <- yes.
$(document).ready(() => {
    $.getJSON('/api/whoami', (data) => {
        DOMAIN = data.domain;
        if (DOMAIN.includes('https://') || DOMAIN.includes('http://')) DOMAIN = DOMAIN.split('://')[1];
    }, () => {
        document.location = '/login?redir=/qt/send';
    });

    start();
});

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}


function start() {
    // Get user's storage
    $.getJSON('/api/storage', async (data) => {
        if (data.error && data.reason == 'needs_login') document.location = '/login?redir=/qt/send';

        // handshake with websocket
        SOCKET = new WebSocket(`ws://${DOMAIN}`);

        SOCKET.addEventListener('message', (event) => {
            const data = JSON.parse(event.data);

            if (data.message_type == 'handshake' && data.data == 'please identify') {
                SOCKET.send(`{"message_type":"handshake","data":"sender ${TOKEN}"}`);
            }

            if (data.message_type == 'handshake' && data.data == 'authentication pass') {
                // allow the rest of the page to load
                $('#hider').css('display', 'flex');
            }

            if (data.message_type == 'handshake' && data.data == 'authentication fail') {
                alert('authentication failure, please log in again');
                document.location = '/login?redir=/qt/send';
            }

            // AWAITING
            if (data.message_type == 'awaiting' && data.data == 'receiver ready') {
                if (transferIsReady) BeginTransfer();
            }

            // BEGIN TRANSFER
            if (data.message_type == 'begin_transfer' && data.data == 'ready') {
                sendChunk();
            }

            // TRANSFER
            if (data.message_type == 'transfer' && data.data == 'pass') {
                sendChunk();
            }
        });
    }).fail((err) => {
        if (err.contains('Too Many Requests')) return alert('Too many API requests. Please wait at least 5 minutes and try again.');
        alert('Error in upload_v6.js.\n\nIf you are on desktop, please open your browser console and report the bug at https://github.com/okawaffles/OkayuCDN');
        console.error('HELLO BUG REPORTER, YOU WANT THIS -> ' + err.responseText);
    });

    // file picker!
    $('#uploadInterface').on('click', FilePickerClicked);
    $('#uploaded').on('change', UpdateFileName);

    // upload button!
    $('#uploadButton').on('click', StartFileUpload);
}

function FilePickerClicked() {
    $('#uploaded')[0].click();
}

function UpdateFileName() {
    $('#filename').text($('#uploaded')[0].files[0].name);
    FILE_NAME = $('#uploaded')[0].files[0].size;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function FPDrag(ev) { ev.preventDefault(); }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function FPDrop(ev) {
    ev.preventDefault();

    $('#fill').css('width', `${(USED_STORAGE / TOTAL_STORAGE)*20}em`);

    const temporaryDataTransfer = new DataTransfer();
    temporaryDataTransfer.items.add(ev.dataTransfer.files[0]);
    $('#uploaded')[0].files = temporaryDataTransfer.files;
    UpdateFileName();
}

let transferIsReady = false;

async function StartFileUpload() {
    if ($('#uploaded')[0].files[0] == undefined) {
        $('#uploadInterface').css('animation', 'file_missing 1s');
        setTimeout(() => {
            $('#uploadInterface').css('animation', 'none');
        }, 1000);
        return;
    }

    $('#hider').css('display', 'none');
    $('#uploadInterface').css('display', 'none');
    $('#uploadButton').css('display', 'none');
    $('#div_progress').css('display', 'flex');
    
    transferIsReady = true;
}

let start_byte = 0;
let current_chunk = 0;
const chunk_size = 1024*1024*5; // 5MB chunks
let file, total_chunks;

async function BeginTransfer() {
    file = $('#uploaded')[0].files[0];
    total_chunks = Math.ceil(file.size / chunk_size);
    
    SOCKET.send(`{"message_type":"begin_transfer","total_chunks":"${total_chunks}","file_name":"${FILE_NAME}","token":"${TOKEN}"}`);
}

async function sendChunk() {
    if (current_chunk <= total_chunks) {
        $('#progress').css('width', `${(current_chunk / total_chunks)*100}%`);

        const end_byte = Math.min(start_byte + chunk_size, file.size);
        const chunk = file.slice(start_byte, end_byte);
        start_byte += chunk_size;

        SOCKET.send(`{"message_type":"transfer","chunk":"${current_chunk}","data":"${chunk}","token":"${TOKEN}"}`);

        current_chunk++;
    }
}

$(window).on('beforeunload', (e) => {
    if (!transferIsReady) return;
    
    if (confirm('WARNING: Leaving will cancel your upload! Are you sure you want to leave?')) {
        e.preventDefault();
    }
});

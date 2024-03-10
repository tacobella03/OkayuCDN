let currentProcess = 'login';
let next = '/account';
if (document.location.toString().includes('?redir=')) {
    next = document.location.toString().split('?redir=')[1];
}

$(document).ready(() => {
    $('#login').on('click', () => {

        if (currentProcess == '2fa') {
            $('#twofactor-code').prop('disabled', true);
            $('#login_error').css('visibility', 'hidden');

            $.post('/api/2fa/verify', {username:$('#username')[0].value, userToken:$('#twofactor-code')[0].value}, (data) => {
                if (data.result == 200) {
                    document.cookie = `token=${data.token};`;
                    document.location = next;
                    return;
                } else {
                    $('#login_error').css('visibility', 'visible').html('Unable to verify two-factor authentication.');
                    $('#twofactor-code').prop('disabled', false)[0].value = '';
                    $('#twofactor-inputs').css('animation', 'bad-login 0.5s ease-in-out');
                    setTimeout(() => {
                        $('#twofactor-inputs').css('animation', 'none');
                    }, 550);
                    return;
                }
            }).fail(() => {
                // probably bad request
                $('#login_error').css('visibility', 'visible').html('Server communication error, please try again.');
                $('#twofactor-code').prop('disabled', false)[0].value = '';
                $('#twofactor-inputs').css('animation', 'bad-login 0.5s ease-in-out');
                setTimeout(() => {
                    $('#twofactor-inputs').css('animation', 'none');
                }, 550);
                return;
            });
            return;
        }

        // hide buttons
        $('#login-options').css('visibility', 'hidden');
        $('#login_error').css('visibility', 'hidden');
        $('#username').prop('disabled', true);
        $('#password').prop('disabled', true);

        // send login post
        $.post('/api/login', {username:$('#username')[0].value, password:$('#password')[0].value}, (data) => {
            console.log(data);
            if (data.result != 200) {
                // login failed, show error and let user try again
                $('#login-options').css('visibility', 'visible');
                $('#login_error').css('visibility', 'visible').html('Please check your username and password.');
                $('#username').prop('disabled', false);
                $('#password').prop('disabled', false)[0].value = ''; // un-disable AND clear it

                $('#inputs').css('animation', 'bad-login 0.5s ease-in-out');
                setTimeout(() => {
                    $('#inputs').css('animation', 'none');
                }, 550);
                return;
            }

            if (!data.uses2FA) {
                document.cookie = `token=${data.token};`;
                document.location = next;
                return;
            } else {
                currentProcess = '2fa';
                $('#login-options').css('visibility', 'visible').html('Verify 2FA');
                $('#inputs').css('display', 'none');
                $('#twofactor-inputs').css('display', 'flex');
            }
        }).fail(() => {
            // login failed, show error and let user try again
            $('#login').css('visibility', 'visible');

            if ($('#username')[0].value == '' || $('#password')[0].value == '')
                $('#login_error').css('visibility', 'visible').html('Please fill out both fields.');
            else
                $('#login_error').css('visibility', 'visible').html('Please check your username and password.');

            $('#username').prop('disabled', false);
            $('#password').prop('disabled', false)[0].value = ''; // un-disable AND clear it

            $('#inputs').css('animation', 'bad-login 0.5s ease-in-out');
            setTimeout(() => {
                $('#inputs').css('animation', 'none');
            }, 550);
            return;
        });
    });


    // passkey button
    $('#passkey').on('click', async () => {
        $('#login-options').css('visibility', 'hidden');
        $('#login_error').css('visibility', 'hidden');
        $('#username').prop('disabled', true);
        $('#password').prop('disabled', true);

        if ($('#username')[0].value == '') {
            $('#login-options').css('visibility', 'visible');
            $('#login_error').css('visibility', 'visible').html('Please enter your username to use passkey!');
            $('#inputs').css('animation', 'bad-login 0.5s ease-in-out');
            $('#username').prop('disabled', false);
            $('#password').prop('disabled', false);
            setTimeout(() => {
                $('#inputs').css('animation', 'none');
            }, 550);
            return;
        }

        const resp = await fetch('/api/2fa/pklogin/start', {
            method:'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username:$('#username')[0].value
            })
        });
        
        let asseResp;

        try {
            asseResp = await SimpleWebAuthnBrowser.startAuthentication(resp.json());
        } catch (err) {
            $('#login-options').css('visibility', 'visible');
            $('#login_error').css('visibility', 'visible').html('Passkey is unavailable for this account.');
            $('#inputs').css('animation', 'bad-login 0.5s ease-in-out');
            $('#username').prop('disabled', false);
            $('#password').prop('disabled', false);
            setTimeout(() => {
                $('#inputs').css('animation', 'none');
            }, 550);
            return;
        }

        /*$.post('/api/2fa/pklogin/start', {username:$('#username')[0].value}, async (data) => {
            let asseResp;

            try {
                asseResp = await SimpleWebAuthnBrowser.startAuthentication(data);

                const verificationResp = await fetch('/api/2fa/pklogin/finish', {
                    method: 'POST',
                    headers: {
                        'Content-Type':'application/json'
                    },
                    body: JSON.stringify(asseResp)
                });

                const verificationJSON = await verificationResp.json();

                if (verificationJSON.verified) {
                    alert('It worked!');
                }
            } catch (err) {
                $('#login-options').css('visibility', 'visible');
                $('#login_error').css('visibility', 'visible').html('Passkey login failed.');
                $('#inputs').css('animation', 'bad-login 0.5s ease-in-out');
                $('#username').prop('disabled', false);
                $('#password').prop('disabled', false);
                setTimeout(() => {
                    $('#inputs').css('animation', 'none');
                }, 550);
                console.error(err);
                return;
            }
        }).fail((data) => {
            $('#login-options').css('visibility', 'visible');
            $('#login_error').css('visibility', 'visible').html('Passkey is unavailable for this account.');
            $('#inputs').css('animation', 'bad-login 0.5s ease-in-out');
            $('#username').prop('disabled', false);
            $('#password').prop('disabled', false);
            setTimeout(() => {
                $('#inputs').css('animation', 'none');
            }, 550);
            return;
        });*/
    });
});
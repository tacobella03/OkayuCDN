let jajp = {
    "parts":{
        "menubar":{
            "landing":'<i class="fa-solid fa-plane-arrival"></i> 着陸なページを見っている',
            "home":'<i class="fa-solid fa-house"></i> ホーム',
            "upload":'<i class="fa-solid fa-upload"></i> アップロード',
            "mybox":'<i class="fa-solid fa-circle-info"></i> ダンボール',
            "info":'<i class="fa-solid fa-circle-info"></i> インフォ',
            "login":'ログイン',
            "logout":'<i class="fa-solid fa-right-from-bracket"></i> ログアウト'
        },
        "banner": {
            "gdpr":"我々は、ログインクッキーためたった。心得ないなら、お願いOkayuCDNを使うません。",
            "okay":"OK",
            "tfa":"今は、OkayuCDNの二要素認証はベータ版です！",
            "tfa_try":"それ試す！",
            "bugtest_hey":"ねぇ、",
            "bugtest_bnr":"あなたはバグテスターです！僕たちは、あなたの保存を増えりました！ありがとうございます！"
        },
        "home": [
            "OkayuCDNへようこそ！",
            "ここで君のファイルを無料にアップロード！",
            "全部なファイルタイプとDiscordの埋め込みは支持します"
        ],
        "login": [
            "OkayuCDNへようこそ！",
            "ログインして準備をしましょう！",
            "ユーザーネーム",
            "パスワード",
            "行くよ！",
            "アカウントが有しません",
            "二要素認証",
            "誤りがありますなら、oka@waffle.moeをコンタクトください。",
            "二要素認証コード",
            "不正解の二要素認証コード",
            "行くよ"
        ],
        "upload": [
            "OkayuCDNへアップロードします",
            "保存：ロードします",
            "ファイルを名付ける",
            "アップロードする",
            "プレミアム",
            "バグテスター",

        ]
    }
}

un = "ユーザ";
function langSetUsername(name) { un = name };

function doMenubar(lang, page) {
    let menubar = document.getElementsByClassName('nav_links')[0].children;
    switch (page) {
        case 'landing':
            menubar[0].children[0].innerHTML = lang.parts.menubar.home;
            menubar[1].children[0].innerHTML = lang.parts.menubar.landing;
            break;
        case 'home': case 'info':
            menubar[0].children[0].innerHTML = lang.parts.menubar.home;
            menubar[1].children[0].innerHTML = lang.parts.menubar.upload;
            menubar[2].children[0].innerHTML = lang.parts.menubar.mybox;
            menubar[3].children[0].innerHTML = lang.parts.menubar.info;
            break;
        case 'upload':
            menubar[0].children[0].innerHTML = lang.parts.menubar.home;
            menubar[1].children[0].innerHTML = lang.parts.menubar.upload;
            menubar[2].children[0].innerHTML = lang.parts.menubar.mybox;
            menubar[3].children[0].innerHTML = lang.parts.menubar.info;
            menubar[4].children[0].innerHTML = lang.parts.menubar.logout;
            break;
    }
}

function checkLanguage(page) {
    if (document.cookie.includes('language=ja-jp')) {
        switch (page) {
            case 'landing':
                doMenubar(jajp, 'landing');
                break;

            case 'home':
                doMenubar(jajp, 'home');
                $('#t_title').html(jajp.parts.home[0])
                $('#t_sa').html(jajp.parts.home[1])
                $('#t_sb').html(jajp.parts.home[2])
                $('#gdpr')[0].children[0].innerText = jajp.parts.banner.tfa;
                $('#gdpr')[0].children[1].innerText = jajp.parts.banner.tfa_try;
                break;

            case 'login':
                doMenubar(jajp, 'home');
                $("#gdpr")[0].children[0].innerText = jajp.parts.banner.gdpr;
                $("#gdpr")[0].children[1].innerText = jajp.parts.banner.okay;
                $(".login_title").html(jajp.parts.login[0])
                $(".login_subtitle")[0].innerText = jajp.parts.login[1]
                $("#un")[0].placeholder = jajp.parts.login[2]
                $("#pw")[0].placeholder = jajp.parts.login[3]
                $("#submit").html(jajp.parts.login[4])
                $(".noacc").html(jajp.parts.login[5])
                $(".login_subtitle")[1].innerText = jajp.parts.login[6]
                $(".login_subtitle")[2].innerText = jajp.parts.login[7]
                $("#code")[0].placeholder = (jajp.parts.login[8])
                $(".error_2fa").text(jajp.parts.login[9])
                $("#go_2fa").text(jajp.parts.login[10])
                break;

            case 'upload':
                doMenubar(jajp, 'upload');
                $("#title").html(jajp.parts.upload[0]);
                $("#filename")[0].placeholder = (jajp.parts.upload[2]);
                $("#uploadBtn")[0].innerText = jajp.parts.upload[3];
                $("#banner-contents")[0].innerText = jajp.parts.banner.bugtest_hey + un + "！" + jajp.parts.banner.bugtest_bnr;
                $("#premium-tag")[0].innerText = jajp.parts.upload[4];
                $("#bugtest-tag")[0].innerText = jajp.parts.upload[5];
                break;
        
            default:
                break;
        }
    }
}
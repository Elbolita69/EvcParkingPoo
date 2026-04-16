(function (d, t) {
    const v = d.createElement(t);
    const s = d.getElementsByTagName(t)[0];
    v.onload = function () {
        window.voiceflow.chat.load({
            verify:    { projectID: '673a4605bdb17488f6f99497' },
            url:       'https://general-runtime.voiceflow.com',
            versionID: 'production'
        });
    };
    v.src  = 'https://cdn.voiceflow.com/widget/bundle.mjs';
    v.type = 'text/javascript';
    s.parentNode.insertBefore(v, s);
}(document, 'script'));

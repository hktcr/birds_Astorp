(function () {
    'use strict';

    const form = document.getElementById('contact-form');
    if (!form) return;

    const firstName = document.getElementById('contact-first-name');
    const lastName = document.getElementById('contact-last-name');
    const email = document.getElementById('contact-email');
    const message = document.getElementById('contact-message');

    message.addEventListener('input', function () {
        message.setCustomValidity('');
    });

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        message.setCustomValidity(message.value.trim() ? '' : 'Skriv ett meddelande.');
        if (!form.reportValidity()) return;

        const name = [firstName.value.trim(), lastName.value.trim()]
            .filter(Boolean).join(' ').replace(/[\r\n]+/g, ' ');
        const subject = 'Kontakt via Fågelåret i Åstorp' + (name ? ': ' + name : '');
        const body = (name ? 'Namn: ' + name + '\r\n' : '') +
            'E-post: ' + email.value.trim() + '\r\n\r\n' + message.value.trim();

        window.location.href = 'mailto:HLG.Karlsson@gmail.com?subject=' +
            encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
}());

/* ============================================================================
   Report-builder shell controller (skeleton)

   Generic across templates: everything template-specific (title, drawer
   links, input tabs, copy buttons, settings tabs) lives in the page's config
   script (MarrowConfig.js, LiverConfig.js, ...),
   which must load BEFORE this file. This file builds the shell from that
   config and wires tab switching, the nav drawer, and the toast.

   To create a new template, add an entry page + config file — don't edit this file.
   ========================================================================= */


/* ----------------------------------------------------------------------------
   Tab -> panel map.

   Every clickable tab carries class "headerTab" plus, as its FIRST class, the
   name of the tab GROUP it belongs to ("pageTab", "templateTab", "settingTab").
   Clicking a tab hides every panel owned by its own group and shows just this
   one, so groups switch independently and nesting works for free.

   The pageTab group is fixed shell chrome, declared here. The templateTab and
   settingTab groups are template-specific: buildTabs() adds one entry per
   config item, following the id convention (id "spec" -> specTab: 'specPanel').
-------------------------------------------------------------------------- */
const headerObject = {
    // group: pageTab
    templateTab: 'templatePanel',
    helpTab: 'helpPanel',
    infoTab: 'infoPanel',
    saveTab: 'savePanel',
    settingTab: 'settingPanel'
};


/* ----------------------------------------------------------------------------
   Shell builders — turn templateConfig into markup.
-------------------------------------------------------------------------- */
function buildNavLinks(links) {
    const host = document.getElementById('navLinks');
    if (!host) return;

    links.forEach(function (link) {
        const item = document.createElement('div');
        item.className = 'navItem' + (link.active ? ' active' : '');

        const anchor = document.createElement('a');
        anchor.href = link.href;

        if (link.icon) {
            const icon = document.createElement('i');
            icon.className = link.icon + ' headerIcon';
            anchor.appendChild(icon);
        }
        anchor.appendChild(document.createTextNode(link.label));

        item.appendChild(anchor);
        host.appendChild(item);
    });
}

/* Builds one tab group: the tab elements, one empty .panelBody per tab, and
   the headerObject entries. If the markup already contains a body with the
   conventional id (e.g. a hand-written #specPanel), it is used instead of
   creating one. The first tab starts selected, its panel visible. */
function buildTabs(tabs, groupClass, barId, bodyHostId) {
    const bar = document.getElementById(barId);
    const bodyHost = document.getElementById(bodyHostId);
    if (!bar || !bodyHost) return;

    tabs.forEach(function (tab, index) {
        const tabEl = document.createElement('div');
        tabEl.className = groupClass + ' headerTab underline ' + (index === 0 ? 'clicked' : 'unclicked');
        tabEl.id = tab.id + 'Tab';

        if (tab.icon) {
            const icon = document.createElement('i');
            icon.className = tab.icon + ' headerIcon';
            tabEl.appendChild(icon);
        }
        tabEl.appendChild(document.createTextNode(tab.label));
        bar.appendChild(tabEl);

        headerObject[tab.id + 'Tab'] = tab.id + 'Panel';

        let body = document.getElementById(tab.id + 'Panel');
        if (!body) {
            body = document.createElement('div');
            body.className = 'panelBody';
            body.id = tab.id + 'Panel';
            bodyHost.appendChild(body);
        }
        // Same rule as the switcher below: hide with 'none', show by getting out
        // of the stylesheet's way.
        body.style.display = index === 0 ? '' : 'none';
    });
}

function buildCopyButtons(buttons) {
    const bar = document.getElementById('copyButtonBar');
    if (!bar) return;

    buttons.forEach(function (button) {
        const buttonEl = document.createElement('div');
        /* Just .copyButton. It used to carry `underline unclicked` too — the tab
           classes — but a copy button has no selected state to be in or out of,
           and those only stood between it and its own styling. */
        buttonEl.className = 'copyButton';
        buttonEl.id = button.id;

        if (button.icon) {
            const icon = document.createElement('i');
            icon.className = button.icon + ' headerIcon';
            buttonEl.appendChild(icon);
        }
        buttonEl.appendChild(document.createTextNode(button.label));
        bar.appendChild(buttonEl);
    });
}

(function buildShell() {
    if (typeof templateConfig === 'undefined') {
        console.error('templateConfig not found — a config script (e.g. MarrowConfig.js) must be loaded before Template.js.');
        return;
    }

    document.title = templateConfig.pageTitle;
    const titleEl = document.querySelector('.header .title');
    if (titleEl) titleEl.textContent = templateConfig.pageTitle;

    buildNavLinks(templateConfig.navLinks || []);
    buildTabs(templateConfig.inputTabs || [], 'templateTab', 'inputTabBar', 'inputBodies');
    buildCopyButtons(templateConfig.copyButtons || []);
    buildTabs(templateConfig.settingsTabs || [], 'settingTab', 'settingTabBar', 'settingBodies');
})();


/* ----------------------------------------------------------------------------
   Tab switching. Runs after buildShell so the generated tabs are wired too.
-------------------------------------------------------------------------- */
document.querySelectorAll('.headerTab').forEach(function (el) {
    el.addEventListener('click', function () {
        const group = this.className.split(' ')[0];

        document.querySelectorAll('.' + group).forEach(function (tab) {
            tab.classList.remove('clicked');
            tab.classList.add('unclicked');

            const targetDiv = document.getElementById(headerObject[tab.id]);
            if (targetDiv) targetDiv.style.display = 'none';
        });

        // '' rather than 'block': showing something is the job here, deciding
        // HOW it lays out is the stylesheet's. An inline 'block' would beat
        // .panel's `display: flex` and collapse the column that gives its body
        // a height to scroll inside.
        const activeDiv = document.getElementById(headerObject[this.id]);
        if (activeDiv) activeDiv.style.display = '';

        this.classList.add('clicked');
        this.classList.remove('unclicked');
    });
});


/* ----------------------------------------------------------------------------
   Nav drawer
-------------------------------------------------------------------------- */
document.querySelectorAll('.navbarIcon').forEach(function (el) {
    el.addEventListener('click', function () {
        document.getElementById('navbar')?.classList.toggle('open');
        document.getElementById('overlay')?.classList.toggle('open');
    });
});

document.getElementById('overlay')?.addEventListener('click', function () {
    document.getElementById('navbar')?.classList.remove('open');
    this.classList.remove('open');
});


/* ----------------------------------------------------------------------------
   Toast — showAlert('success' | 'error', 'message')
-------------------------------------------------------------------------- */
function showAlert(actionType, customMessage = '') {
    const alertEl = document.getElementById('alert');
    const alertIcon = document.getElementById('alertIcon');
    const alertText = document.getElementById('alertText');
    if (!alertEl) return;

    alertEl.classList.remove('error');
    if (alertIcon) alertIcon.style.color = '#28a745';

    if (actionType === 'success') {
        if (alertIcon) alertIcon.className = 'fas fa-check-circle';
        if (alertText) alertText.textContent = customMessage;
    } else if (actionType === 'error') {
        alertEl.classList.add('error');
        if (alertIcon) {
            alertIcon.className = 'fas fa-exclamation-circle';
            alertIcon.style.color = '#dc3545';
        }
        if (alertText) alertText.textContent = customMessage;
    }

    // Restart the entry animation even if a toast is already showing.
    alertEl.classList.remove('show');
    void alertEl.offsetWidth;
    alertEl.classList.add('show');

    if (window.alertTimeout) clearTimeout(window.alertTimeout);
    window.alertTimeout = setTimeout(() => {
        alertEl.classList.remove('show');
    }, 3000);
}

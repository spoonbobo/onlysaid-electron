import {
    app,
    Menu,
    shell,
    BrowserWindow,
    MenuItemConstructorOptions,
} from 'electron';

interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
    selector?: string;
    submenu?: DarwinMenuItemConstructorOptions[] | Menu;
}

export default class MenuBuilder {
    mainWindow: BrowserWindow;

    constructor(mainWindow: BrowserWindow) {
        this.mainWindow = mainWindow;
    }

    buildMenu(): Menu {
        if (
            process.env.NODE_ENV === 'development' ||
            process.env.DEBUG_PROD === 'true'
        ) {
            this.setupDevelopmentEnvironment();
        }

        const template =
            process.platform === 'darwin'
                ? this.buildDarwinTemplate()
                : this.buildDefaultTemplate();

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);

        return menu;
    }

    setupDevelopmentEnvironment(): void {
        this.mainWindow.webContents.on('context-menu', (_, props) => {
            const { x, y } = props;

            Menu.buildFromTemplate([
                {
                    label: 'Inspect element',
                    click: () => {
                        this.mainWindow.webContents.inspectElement(x, y);
                    },
                },
            ]).popup({ window: this.mainWindow });
        });
    }

    buildDarwinTemplate(): MenuItemConstructorOptions[] {
        const subMenuAbout: DarwinMenuItemConstructorOptions = {
            label: 'Electron',
            submenu: [
                {
                    label: 'About ElectronReact',
                    selector: 'orderFrontStandardAboutPanel:',
                },
                { type: 'separator' },
                { label: 'Services', submenu: [] },
                { type: 'separator' },
                {
                    label: 'Hide ElectronReact',
                    accelerator: 'Command+H',
                    selector: 'hide:',
                },
                {
                    label: 'Hide Others',
                    accelerator: 'Command+Shift+H',
                    selector: 'hideOtherApplications:',
                },
                { label: 'Show All', selector: 'unhideAllApplications:' },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: 'Command+Q',
                    click: () => {
                        app.quit();
                    },
                },
            ],
        };
        const subMenuFile: DarwinMenuItemConstructorOptions = {
            label: 'File',
            submenu: [
                { type: 'separator' },
                { label: 'Open', accelerator: 'Command+O' },
                { label: 'Close', accelerator: 'Command+Q', click: () => { this.mainWindow.close(); } },
            ],
        };
        const subMenuEdit: DarwinMenuItemConstructorOptions = {
            label: 'Edit',
            submenu: [
                { label: 'Undo', accelerator: 'Command+Z', selector: 'undo:' },
                { label: 'Redo', accelerator: 'Shift+Command+Z', selector: 'redo:' },
                { type: 'separator' },
                { label: 'Cut', accelerator: 'Command+X', selector: 'cut:' },
                { label: 'Copy', accelerator: 'Command+C', selector: 'copy:' },
                { label: 'Paste', accelerator: 'Command+V', selector: 'paste:' },
                {
                    label: 'Select All',
                    accelerator: 'Command+A',
                    selector: 'selectAll:',
                },
            ],
        };
        const subMenuViewDev: MenuItemConstructorOptions = {
            label: 'View',
            submenu: [
                {
                    label: 'Reload',
                    accelerator: 'Command+R',
                    click: () => {
                        this.mainWindow.webContents.reload();
                    },
                },
                {
                    label: 'Toggle Full Screen',
                    accelerator: 'Ctrl+Command+F',
                    click: () => {
                        this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
                    },
                },
                {
                    label: 'Zoom In',
                    accelerator: 'Command++',
                    click: () => {
                        const currentZoom = this.mainWindow.webContents.getZoomFactor();
                        this.mainWindow.webContents.setZoomFactor(currentZoom + 0.1);
                    },
                },
                {
                    label: 'Zoom Out',
                    accelerator: 'Command+-',
                    click: () => {
                        const currentZoom = this.mainWindow.webContents.getZoomFactor();
                        this.mainWindow.webContents.setZoomFactor(Math.max(0.1, currentZoom - 0.1));
                    },
                },
                {
                    label: 'Reset Zoom',
                    accelerator: 'Command+0',
                    click: () => {
                        this.mainWindow.webContents.setZoomFactor(1.0);
                    },
                },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: 'Alt+Command+I',
                    click: () => {
                        this.mainWindow.webContents.toggleDevTools();
                    },
                },
            ],
        };
        const subMenuViewProd: MenuItemConstructorOptions = {
            label: 'View',
            submenu: [
                {
                    label: 'Toggle Full Screen',
                    accelerator: 'Ctrl+Command+F',
                    click: () => {
                        this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
                    },
                },
                {
                    label: 'Zoom In',
                    accelerator: 'Command++',
                    click: () => {
                        const currentZoom = this.mainWindow.webContents.getZoomFactor();
                        this.mainWindow.webContents.setZoomFactor(currentZoom + 0.1);
                    },
                },
                {
                    label: 'Zoom Out',
                    accelerator: 'Command+-',
                    click: () => {
                        const currentZoom = this.mainWindow.webContents.getZoomFactor();
                        this.mainWindow.webContents.setZoomFactor(Math.max(0.1, currentZoom - 0.1));
                    },
                },
                {
                    label: 'Reset Zoom',
                    accelerator: 'Command+0',
                    click: () => {
                        this.mainWindow.webContents.setZoomFactor(1.0);
                    },
                },
            ],
        };
        const subMenuWindow: DarwinMenuItemConstructorOptions = {
            label: 'Window',
            submenu: [
                {
                    label: 'Minimize',
                    accelerator: 'Command+M',
                    selector: 'performMiniaturize:',
                },
                { label: 'Close', accelerator: 'Command+W', selector: 'performClose:' },
                { type: 'separator' },
                { label: 'Bring All to Front', selector: 'arrangeInFront:' },
            ],
        };
        const subMenuHelp: MenuItemConstructorOptions = {
            label: 'Help',
            submenu: [
                {
                    label: 'Learn More',
                    click() {
                        shell.openExternal('https://electronjs.org');
                    },
                },
                {
                    label: 'Documentation',
                    click() {
                        shell.openExternal(
                            'https://github.com/electron/electron/tree/main/docs#readme',
                        );
                    },
                },
                {
                    label: 'Community Discussions',
                    click() {
                        shell.openExternal('https://www.electronjs.org/community');
                    },
                },
                {
                    label: 'Search Issues',
                    click() {
                        shell.openExternal('https://github.com/electron/electron/issues');
                    },
                },
            ],
        };

        const subMenuView =
            process.env.NODE_ENV === 'development' ||
                process.env.DEBUG_PROD === 'true'
                ? subMenuViewDev
                : subMenuViewProd;

        return [subMenuAbout, subMenuFile, subMenuEdit, subMenuView, subMenuWindow, subMenuHelp];
    }

    buildDefaultTemplate() {
        const templateDefault = [
            {
                label: '&File',
                submenu: [
                    {
                        label: '&Open',
                        accelerator: 'Ctrl+O',
                    },
                    {
                        label: '&Close',
                        accelerator: 'Ctrl+Q',
                        click: () => {
                            this.mainWindow.close();
                        },
                    },
                ],
            },
            {
                label: '&View',
                submenu:
                    process.env.NODE_ENV === 'development' ||
                        process.env.DEBUG_PROD === 'true'
                        ? [
                            {
                                label: '&Reload',
                                accelerator: 'Ctrl+R',
                                click: () => {
                                    this.mainWindow.webContents.reload();
                                },
                            },
                            {
                                label: 'Toggle &Full Screen',
                                accelerator: 'F11',
                                click: () => {
                                    this.mainWindow.setFullScreen(
                                        !this.mainWindow.isFullScreen(),
                                    );
                                },
                            },
                            {
                                label: 'Zoom &In',
                                accelerator: 'CommandOrControl+=',
                                click: () => {
                                    const currentZoom = this.mainWindow.webContents.getZoomFactor();
                                    this.mainWindow.webContents.setZoomFactor(currentZoom + 0.1);
                                },
                            },
                            {
                                label: 'Zoom &Out',
                                accelerator: 'Ctrl+-',
                                click: () => {
                                    const currentZoom = this.mainWindow.webContents.getZoomFactor();
                                    this.mainWindow.webContents.setZoomFactor(Math.max(0.1, currentZoom - 0.1));
                                },
                            },
                            {
                                label: 'Reset &Zoom',
                                accelerator: 'Ctrl+0',
                                click: () => {
                                    this.mainWindow.webContents.setZoomFactor(1.0);
                                },
                            },
                            {
                                label: 'Toggle &Developer Tools',
                                accelerator: 'Alt+Ctrl+I',
                                click: () => {
                                    this.mainWindow.webContents.toggleDevTools();
                                },
                            },
                        ]
                        : [
                            {
                                label: 'Toggle &Full Screen',
                                accelerator: 'F11',
                                click: () => {
                                    this.mainWindow.setFullScreen(
                                        !this.mainWindow.isFullScreen(),
                                    );
                                },
                            },
                            {
                                label: 'Zoom &In',
                                accelerator: 'CommandOrControl+=',
                                click: () => {
                                    const currentZoom = this.mainWindow.webContents.getZoomFactor();
                                    this.mainWindow.webContents.setZoomFactor(currentZoom + 0.1);
                                },
                            },
                            {
                                label: 'Zoom &Out',
                                accelerator: 'Ctrl+-',
                                click: () => {
                                    const currentZoom = this.mainWindow.webContents.getZoomFactor();
                                    this.mainWindow.webContents.setZoomFactor(Math.max(0.1, currentZoom - 0.1));
                                },
                            },
                            {
                                label: 'Reset &Zoom',
                                accelerator: 'Ctrl+0',
                                click: () => {
                                    this.mainWindow.webContents.setZoomFactor(1.0);
                                },
                            },
                        ],
            },
            {
                label: 'Help',
                submenu: [
                    {
                        label: 'Learn More',
                        click() {
                            shell.openExternal('https://onlysaid.com/zh-HK');
                        },
                    },
                    {
                        label: 'Documentation',
                        click() {
                            shell.openExternal(
                                'https://github.com/electron/electron/tree/main/docs#readme',
                            );
                        },
                    },
                    {
                        label: 'Community Discussions',
                        click() {
                            shell.openExternal('https://www.electronjs.org/community');
                        },
                    },
                    {
                        label: 'Search Issues',
                        click() {
                            shell.openExternal('https://github.com/electron/electron/issues');
                        },
                    },
                ],
            },
        ];

        return templateDefault;
    }
}

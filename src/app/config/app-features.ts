export const APP_FEATURES = [
    {
        id: 'tables',
        label: 'Mesas',
        icon: 'dine_lamp',
        path: '/home/tables',
        order: 1,
        tabVisible: true,
        visible: [
            {
                type: 'config',
                operator: 'eq',
                value: 'true',
                config: 'tk.useTable'
            }
        ]
    },
    {
        id: 'tickets',
        label: 'Comandas',
        icon: 'receipt',
        path: '/home/tickets',
        order: 2,
        tabVisible: true,
        visible: [
            {
                type: 'config',
                operator: 'eq',
                value: 'true',
                config: 'tk.useTicket'
            }
        ]
    }
]

export const TABS = APP_FEATURES.filter(f => f.tabVisible).sort((a, b) => a.order - b.order)
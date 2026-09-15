import { Routes } from '@angular/router';
import { LoginComponent } from './modules/login/login.component';
import { AppShell } from './components/shell/shell';
import { authGuard } from './guards/auth.guard';
import { TablesComponent } from './modules/table-ticket/tables/tables.component';
import { TicketsComponent } from './modules/table-ticket/tickets/tickets.component';
import { SummaryComponent } from './modules/table-ticket/summary/summary.component';
import { BasketComponent } from './modules/consumption/basket/basket.component';
import { TabsComponent } from './components/tabs/tabs';
import { OrderComponent } from './modules/consumption/order/order.component';

export const routes: Routes = [
    {
        path: 'login',
        component: LoginComponent
    },
    {
        path: '',
        canActivate: [authGuard],
        component: AppShell,
        children: [
            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'home'
            },
            {
                path: 'home',
                component: TabsComponent,
                children: [
                    {
                        path: '',
                        pathMatch: 'full',
                        redirectTo: 'tables'
                    },
                    {
                        path: 'tables',
                        component: TablesComponent
                    },
                    {
                        path: 'tickets',
                        component: TicketsComponent
                    },
                ]
            },
            {
                path: 'table-ticket-summary/:id',
                component: SummaryComponent
            },
            {
                path: 'basket',
                component: BasketComponent
            },
            {
                path: 'order',
                component: OrderComponent
            },
            {
                path: 'order/:id',
                component: OrderComponent
            }
        ]
    }
];

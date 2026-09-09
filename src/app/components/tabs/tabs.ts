import { Component, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TABS } from '../../config/app-features';
import { CommonModule } from '@angular/common';
import { AvIcon } from '../angular-visuals/components/icons';

@Component({
  selector: 'app-tabs',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AvIcon, CommonModule, RouterLink],
  standalone: true,
  templateUrl: './tabs.html',
  styleUrl: './tabs.css',
})
export class TabsComponent {
  APP_FEATURES = TABS

  drawerOpen = signal<boolean>(false)
}

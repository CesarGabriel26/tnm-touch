import { Component, Input } from '@angular/core';
import { DialogService } from '@/app/services/dialog.service';
import { AvButton } from '@/app/components/angular-visuals/components/buttons';

@Component({
  selector: 'app-summary-options.component',
  imports: [AvButton],
  templateUrl: './summary-options.component.html',
  styleUrl: './summary-options.component.css',
})
export class SummaryOptionsComponent {
  constructor(
    private dialogService: DialogService
  ) { }

  select(action: string) {
    this.dialogService.close(action)
  }


  close() {
    this.dialogService.close()
  }

}

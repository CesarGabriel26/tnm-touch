import { Component, Input } from '@angular/core';
import { AvButton } from "../../../angular-visuals/components/buttons";
import { DialogService } from '@/app/services/dialog.service';

@Component({
  selector: 'app-summary-options.component',
  imports: [AvButton],
  templateUrl: './summary-options.component.html',
  styleUrl: './summary-options.component.css',
})
export class SummaryOptionsComponent {

  @Input() hasSelectedItems!: boolean

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

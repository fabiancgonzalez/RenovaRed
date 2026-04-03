import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-help',
  standalone: true,
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.css']
})
export class HelpComponent {
  readonly pdfHref = '/assets/help/Ayuda%20RenovaRed.pdf#view=FitH';
  readonly pdfUrl: SafeResourceUrl;

  constructor(private readonly sanitizer: DomSanitizer) {
    this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfHref);
  }
}

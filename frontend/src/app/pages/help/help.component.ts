import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.css']
})
export class HelpComponent {
  readonly pdfHref = '/assets/help/Ayuda%20RenovaRed.pdf';
  readonly pdfUrl: SafeResourceUrl;
  readonly isMobile: boolean;

  constructor(private readonly sanitizer: DomSanitizer) {
    this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfHref + '#view=FitH');
    this.isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
      typeof navigator !== 'undefined' ? navigator.userAgent : ''
    );
  }
}

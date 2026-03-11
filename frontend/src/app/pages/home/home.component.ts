import { Component, AfterViewInit } from '@angular/core';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements AfterViewInit {
  ngAfterViewInit() {
      const cards = document.querySelectorAll('.card');

      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if(entry.isIntersecting){
            entry.target.classList.add('show');
          }else {
            entry.target.classList.remove('show');
          }
        });
      },{
        threshold: 0.3
      });
      cards.forEach(card => {
        observer.observe(card)
      })
  }
}

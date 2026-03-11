import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from "@angular/common";

@Component({
  selector: 'app-login',
  imports: [RouterLink, NgClass],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  showPassword = false;

  togglePassword(){
    this.showPassword = !this.showPassword
  }
}

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from "@angular/common";
@Component({
  selector: 'app-register',
  imports: [RouterLink, NgClass],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})

export class RegisterComponent {
  showPassword = false;
  showConfirmPassword = false;

  togglePassword(){
    this.showPassword = !this.showPassword
  }
  toggleConfirmPassword(){
    this.showConfirmPassword = !this.showConfirmPassword
  }
}


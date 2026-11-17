import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { homeFor } from '../../core/auth/role';
import { Session } from '../../core/auth/session';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly router = inject(Router);
  protected readonly session = inject(Session);
  protected readonly homeFor = homeFor;

  protected signOut(): void {
    this.session.end();
    void this.router.navigateByUrl('/');
  }
}

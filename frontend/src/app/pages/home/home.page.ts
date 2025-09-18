import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@auth0/auth0-angular';

@Component({
	selector: 'app-home',
	standalone: true,
	imports: [],
	template: `
		<div class="container">
			<div class="huge">
				<div class="welcome">Welcome to</div>
				<div class="title">Synthia</div>
			</div>

			<div class="card">
				<div class="card-left">
					<div class="motto">
						<span class="line1">Make music.</span>
						<span class="line2">Make friends.</span>
						<span class="line3">Make anything.</span>
					</div>
				</div>
				
				<div class="card-right">
					<button class="btn btn-login" (click)="login()">Login</button>
					<button class="btn btn-register" (click)="login()">Register</button>
				</div>
			</div>

			<button class="btn btn-discover" (click)="discover()">Explore community</button>

			<div class="desc">A digital audio workstation and social platform - actively updated to bring new features every week.</div>
		</div>

		<div class="particle-container">
			<div class="particle" style="top: 20%; left: 10%;"></div>
			<div class="particle" style="top: 60%; left: 80%;"></div>
			<div class="particle" style="top: 30%; left: 70%;"></div>
			<div class="particle" style="top: 80%; left: 20%;"></div>
			<div class="particle" style="top: 10%; left: 50%;"></div>
			<div class="particle" style="top: 70%; left: 40%;"></div>
			<div class="particle" style="top: 40%; left: 90%;"></div>
			<div class="particle" style="top: 90%; left: 60%;"></div>
			<div class="particle" style="top: 15%; left: 30%;"></div>
			<div class="particle" style="top: 55%; left: 15%;"></div>
			<div class="particle" style="top: 75%; left: 75%;"></div>
			<div class="particle" style="top: 35%; left: 5%;"></div>
		</div>
	`,
	styleUrl: './home.page.scss'
})
export class HomePage {
	constructor(
		public auth: AuthService,
		public router: Router,
	) {}

	login() {
		this.auth.loginWithRedirect({
			appState: { target: '/projects/all-projects' }
		})
	}

	discover() {
		this.router.navigate(['/discover']);
	}
}

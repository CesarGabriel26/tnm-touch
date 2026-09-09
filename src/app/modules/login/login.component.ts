import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AvInput } from '../../components/angular-visuals/components/forms';
import { AvButton } from '../../components/angular-visuals/components/buttons';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    AvInput,
    AvButton
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {

  loginForm = new FormGroup({
    username: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required]
    }),

    password: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required]
    })
  });

  loading = signal(false);

  errorMessage = signal('');

  companyId = signal<string | null>(null);

  company = signal<any>({});

  currentYear = signal(new Date().getFullYear());

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
  ) { }

  async ngOnInit(): Promise<void> {
    const companyId = this.route.snapshot.queryParamMap.get('companyId')
    if (companyId) {
      localStorage.setItem('@companyId', companyId || '')
    }
    this.companyId.set(companyId)
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const {
      username,
      password
    } = this.loginForm.getRawValue();

    try {
      console.log(username,
        password);


      this.authService.login(this.companyId()!, username, password).subscribe({
        next: (response: any) => {
          if (!response.success) {
            console.log(response.error);
          }

          localStorage.setItem('@token', response.token)

          this.router.navigate(['/']);
        },
        error: (error: any) => {
          console.error('Login error:', error);
          this.errorMessage.set('Não foi possível validar o login');
        }
      })
    } catch (error: any) {
      console.error('Login error:', error);
      this.errorMessage.set('Não foi possível validar o login');
    } finally {
      this.loading.set(false);
    }
  }

  async backToCompanies(): Promise<void> {
    await this.router.navigate(['/companies-select']);
  }

}

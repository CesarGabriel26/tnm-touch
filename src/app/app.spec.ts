import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { LocalNetworkAccessService } from './services/local-network-access.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should show a recovery action when local network access is unavailable', async () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(LocalNetworkAccessService).state.set('unavailable');
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      'Permissão de rede local necessária'
    );
    expect(compiled.querySelector('button')?.textContent).toContain('Tentar novamente');
  });
});

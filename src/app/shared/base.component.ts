export abstract class BaseComponent {
  alertVisible = false;
  alertType: 'success' | 'error' | 'info' = 'info';
  alertMessage = '';

  showAlert(type: 'success' | 'error' | 'info', message: string) {
    this.alertType = type;
    this.alertMessage = message;
    this.alertVisible = true;

    setTimeout(() => {
      this.alertVisible = false;
    }, 4000);
  }
}

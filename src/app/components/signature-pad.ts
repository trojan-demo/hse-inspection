import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  input,
  output,
  signal,
} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-signature-pad',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  templateUrl: './signature-pad.html',
})
export class SignaturePad {
  readonly label = input('Signature');
  readonly placeholder = input('Auto-filled from respective name');
  readonly signatureText = input('');
  readonly signatureImage = input('');
  readonly signatureImageChange = output<string>();

  @ViewChild('padCanvas') padCanvas?: ElementRef<HTMLCanvasElement>;

  readonly drawMode = signal(false);
  private drawing = false;
  private hasStrokes = false;

  toggleDrawMode(): void {
    const next = !this.drawMode();
    if (!next && this.hasStrokes && this.padCanvas) {
      const dataUrl = this.padCanvas.nativeElement.toDataURL('image/png');
      this.signatureImageChange.emit(dataUrl);
    }
    this.drawMode.set(next);
  }

  clearSignature(): void {
    this.hasStrokes = false;
    this.signatureImageChange.emit('');
    this.clearCanvas();
  }

  clearCanvas(): void {
    const canvas = this.padCanvas?.nativeElement;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    this.hasStrokes = false;
    this.signatureImageChange.emit('');
  }

  onPointerDown(event: PointerEvent): void {
    const canvas = this.padCanvas?.nativeElement;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    ctx.strokeStyle = '#0f4c81';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    this.drawing = true;
    this.hasStrokes = true;
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.drawing) {
      return;
    }
    const canvas = this.padCanvas?.nativeElement;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  onPointerUp(): void {
    if (!this.drawing) {
      return;
    }
    this.drawing = false;
    const canvas = this.padCanvas?.nativeElement;
    if (canvas && this.hasStrokes) {
      this.signatureImageChange.emit(canvas.toDataURL('image/png'));
    }
  }
}

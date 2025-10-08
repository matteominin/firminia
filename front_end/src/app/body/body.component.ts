import { Component, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-body',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './body.component.html',
  styleUrls: ['./body.component.css'],
})
export class BodyComponent implements OnDestroy {

  isRecording = signal(false);
  isSending   = signal(false);
  statusMsg   = signal<string>('');

  // MediaRecorder
  private stream?: MediaStream;
  private mediaRecorder?: MediaRecorder;
  private chunks: Blob[] = [];
  private mimeType = '';

  // Cambia con il tuo endpoint
  private readonly uploadUrl = 'audio';

  constructor(private http: HttpClient) {}

  async onToggle(): Promise<void> {
    this.statusMsg.set('');
    if (!this.isRecording()) {
      await this.startRecording();
    } else {
      await this.stopAndSend();
    }
  }

  private async startRecording(): Promise<void> {
    try {
      // Richiesta permesso microfono
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Scegli il miglior formato supportato
      const prefer = [
        'audio/webm',
      ];
      this.mimeType = prefer.find(t => MediaRecorder.isTypeSupported(t)) ?? '';

      this.mediaRecorder = new MediaRecorder(
        this.stream,
        this.mimeType ? { mimeType: this.mimeType } : undefined
      );

      this.chunks = [];
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) this.chunks.push(e.data);
      };

      this.mediaRecorder.start();
      this.isRecording.set(true);
      this.statusMsg.set(' In registrazione… clicca di nuovo per fermare.');
    } catch (err) {
      console.error(err);
      this.statusMsg.set(' Impossibile accedere al microfono.');
    }
  }

  private async stopAndSend(): Promise<void> {
    if (!this.mediaRecorder) return;
  
    const mr = this.mediaRecorder; 
  
    await new Promise<void>((resolve) => {
      const onStop = () => {
        mr.removeEventListener('stop', onStop);
        resolve();
      };
      mr.addEventListener('stop', onStop);
      mr.stop();
    });
    this.isRecording.set(false);
  
    // Rilascia tracce microfono
    this.stream?.getTracks().forEach(t => t.stop());
  
    // Crea il Blob audio e prepara FormData
    const type = mr.mimeType || this.mimeType || 'audio/webm';
    const blob = new Blob(this.chunks, { type });
    const ext  = type.includes('ogg') ? 'ogg' : 'webm';
    const file = new File([blob], `recording.${ext}`, { type });
  
    const form = new FormData();
    form.append('file', file);
  
    // Invia
    this.isSending.set(true);
    this.statusMsg.set('Invio in corso…');
  
    this.http.post(this.uploadUrl, form).subscribe({
      next: () => {
        this.statusMsg.set('Audio inviato con successo.');
        this.isSending.set(false);
      },
      error: (e) => {
        console.error(e);
        this.statusMsg.set('Errore durante l invio.');
        this.isSending.set(false);
      },
    });
  }
  

  ngOnDestroy(): void {
    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      this.stream?.getTracks().forEach(t => t.stop());
    } catch {}
  }

  get statusMessage(): string {
    return this.statusMsg();
  }
}

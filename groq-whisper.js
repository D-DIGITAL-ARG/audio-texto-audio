/**
 * GroqWhisperModule
 * Módulo para gestionar la conversión de voz a texto usando Groq Whisper-large-v3.
 */
export class GroqWhisperModule {
  constructor() {
    // IMPORTANTE: Reemplaza este valor con tu API Key de Groq
    this.apiKey = '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'; 
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  /**
   * Inicia la captura de audio desde el micrófono del dispositivo.
   */
  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      return true;
    } catch (error) {
      console.error("Error de hardware:", error);
      throw new Error("No se pudo acceder al micrófono. Verifica los permisos del navegador.");
    }
  }

  /**
   * Detiene la grabación activa y empaqueta el audio.
   * @returns {Promise<{blob: Blob, url: string}>}
   */
  async stopRecording() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) return resolve(null);

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Detiene los procesos en segundo plano del micrófono
        this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        resolve({ blob: audioBlob, url: audioUrl });
      };
      
      this.mediaRecorder.stop();
    });
  }

  /**
   * Envía un archivo de audio (grabado o subido) a la API de Groq.
   * @param {Blob|File} audioFile 
   * @returns {Promise<string>} El texto transcrito
   */
  async transcribe(audioFile) {
    if (!this.apiKey || this.apiKey.includes('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')) {
      throw new Error("Falta configurar la API Key en el archivo groq-whisper.js");
    }

    // Whisper procesa mejor si especificamos un nombre de archivo
    const fileName = audioFile.name || 'grabacion_mic.wav';
    
    const formData = new FormData();
    formData.append('file', audioFile, fileName);
    formData.append('model', 'whisper-large-v3');
    formData.append('response_format', 'json');

    try {
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Error en la comunicación con Groq");
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error("Fallo en transcripción:", error);
      throw error;
    }
  }
}

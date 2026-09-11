import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable(
    {
        providedIn: 'root'
    }
)
export class WebsocketClientService {
    private socket!: WebSocket;
    private messageSubject = new Subject<any>();

    public connect(url: string) {
        this.close();
        this.socket = new WebSocket(url);

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.messageSubject.next(data);
        };

        const socket = this.socket;
        return {
            onOpen: (callback: () => void) => {
                socket.onopen = callback;
            },
            onClose: (callback: () => void) => {
                socket.onclose = callback;
            }
        }
    }

    public onMessage(): Observable<any> {
        return this.messageSubject.asObservable();
    }

    public send(data: any) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
        this.socket.send(JSON.stringify(data));
        return true;
    }

    public close() {
        if (!this.socket || this.socket.readyState === WebSocket.CLOSED) return;
        this.socket.close();
    }
}

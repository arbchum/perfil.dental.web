import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse } from '../interface';
import { OrtodonciaDto } from '../interface/ortodoncia.interface';
import { AdminHttpModule } from './http.module';

@Injectable({
  providedIn: AdminHttpModule
})
export class OrtodonciaHttp {
  private api: string;

  constructor(
    private http: HttpClient
  ) {
    this.api = `${environment.api}/Ortodoncia`;
  }

  getOrtodonciaSearch(): Observable<OrtodonciaDto[]> {
    return this.http.get<ApiResponse<OrtodonciaDto[]>>(`${this.api}/GetSearch`).pipe(
      map(res => res.response)
    );
  }
}

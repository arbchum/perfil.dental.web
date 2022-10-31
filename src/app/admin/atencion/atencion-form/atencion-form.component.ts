import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { map, startWith } from 'rxjs';
import { PerfildSweetAlertService } from 'src/app/common';
import { AtencionHttp, ClienteHttp, TratamientoHttp } from '../../shared/http';
import { ClienteDto, DetAtencion, Tratamiento } from '../../shared/interface';

@Component({
  selector: 'app-atencion-form',
  templateUrl: './atencion-form.component.html',
  styleUrls: ['./atencion-form.component.scss']
})
export class AtencionFormComponent implements OnInit {
  dataSource: MatTableDataSource<AbstractControl> = new MatTableDataSource();
  displayedColumns: string[] = [];
  form: FormGroup;
  clientes: ClienteDto[] = [];
  filteredClientes: ClienteDto[];
  tratamientos: Tratamiento[];


  /* #region   Asignación nombres de campos y columnas*/
  cols: any[] = [
    { header: 'Nro.', field: 'index', type: 'index', width: '50', align: 'center', hidefooter: false, colspan: 3, alignfoot: 'right' },
    { header: 'Tratamiento', field: 'nIdTratamiento', type: 'nIdTratamiento', width: '350', align: 'left', hidefooter: true, colspan: 1, alignfoot: 'center' },
    { header: 'Cantidad', field: 'nCantidad', type: 'nCantidad', width: '50', align: 'center', hidefooter: true, colspan: 1, alignfoot: 'center' },
    { header: 'Precio', field: 'nPrecio', type: 'nPrecio', width: '50', align: 'right', hidefooter: false, colspan: 2, alignfoot: 'center' },
    { header: 'Acción', field: 'accion', type: 'accion', width: '50', align: 'center', hidefooter: true, colspan: 1, alignfoot: 'center' }
  ];
  /* #endregion */

  constructor(
    private fb: FormBuilder,
    private clienteHttp: ClienteHttp,
    private tratamientoHttp: TratamientoHttp,
    private atencionHttp: AtencionHttp,
    private router: Router,
    private alert: PerfildSweetAlertService
  ) {
    this.displayedColumns = this.cols.map(({ field }) => field);
    this.form = this.fb.group({
      nIdCliente: [null, Validators.required],
      detAtencion: this.fb.array([]),
      sNota: [null]
    });
  }

  ngOnInit() {
    this.listarClientes();
    this.sNomClienteCtrl.valueChanges.pipe(
      startWith(''),
      map(value => (typeof value === 'string' ? value : value.name)),
      map(name => (name ? this._filter(name) : this.clientes.slice()))
    ).subscribe(res => this.filteredClientes = res);
  }

  get isEmpty(): boolean { return this.dataSource?.data?.length == 0 }
  get sNomClienteCtrl(): FormControl { return this.form.get('nIdCliente') as FormControl; }
  get detAtencionArray(): FormArray { return this.form.get('detAtencion') as FormArray; }

  get sNomClienteError(): unknown { return this.sNomClienteCtrl.hasError('required') ? 'campo requerido' : null }

  listarClientes(): void {
    this.clienteHttp.getClienteSearch().subscribe(
      res => {
        this.clientes = res;
      }
    );
  }

  displayFn(nIdCliente: number): string {
    const cliente = this.clientes.find(item => item.nIdCliente == nIdCliente);
    return cliente ? `${cliente.sNroDocumento} - ${cliente.sNomCliente}` : '';
  }

  private _filter(name: string): ClienteDto[] {
    const filterValue = name.toLowerCase();
    return this.clientes.filter(cliente => cliente.sNomCliente.toLowerCase().includes(filterValue) || cliente.sNroDocumento.includes(filterValue));
  }

  goAtencionListado(): void {
    this.router.navigateByUrl('/atencion/listado');
  }

  private addRow(): void {
    const pForm = this.detAtencionArray.at(this.detAtencionArray.length - 1) as FormGroup;
    if (pForm) {
      if (pForm.invalid) {
        return Object.values(pForm.controls).forEach(control => { control.markAllAsTouched() });
      }
      Object.values(pForm.controls).forEach(control => { control.disable() });
    }
    const lstIdTratamiento = (this.detAtencionArray.getRawValue() as DetAtencion[]).map(item => item.nIdTratamiento);
    const filteredTratamientos = this.tratamientos.filter(item => !lstIdTratamiento.includes(item.nIdTratamiento));
    this.detAtencionArray.push(
      this.fb.group({
        nIdTratamiento: [null, Validators.required],
        lstTratamiento: [filteredTratamientos],
        sNombre: [null],
        nCantidad: [1, Validators.required],
        nPrecio: [null, Validators.required],
      })
    );
    this.dataSource = new MatTableDataSource(this.detAtencionArray.controls);
  }

  addTratamiento(): void {
    if (this.tratamientos) {
      this.addRow();
    } else {
      this.tratamientoHttp.getTratamientoSearch().subscribe(
        res => {
          this.tratamientos = res;
          this.addRow();
        }
      );
    }
  }

  quitTratamiento(index: number): void {
    this.detAtencionArray.removeAt(index);
    const pForm = this.detAtencionArray.at(this.detAtencionArray.length - 1) as FormGroup;
    if (pForm.get('nIdTratamiento')?.enabled) {
      const lstIdTratamiento = (this.detAtencionArray.getRawValue() as DetAtencion[])
        .filter(item => item.nIdTratamiento != pForm.get('nIdTratamiento')?.value)
        .map(item => item.nIdTratamiento);
      const filteredTratamientos = this.tratamientos.filter(item => !lstIdTratamiento.includes(item.nIdTratamiento));
      pForm.get('lstTratamiento')?.setValue(filteredTratamientos);
      this.getPrice(pForm);
    } else {
      Object.values(pForm.controls).forEach(control => { control.enable() });
    }
    this.dataSource = new MatTableDataSource(this.detAtencionArray.controls);
  }

  getPrice(fb: FormGroup): void {
    const objTratamiento = this.tratamientos.find(item => item.nIdTratamiento == fb.get('nIdTratamiento')?.value);
    if (objTratamiento) {
      fb.get('nPrecio')?.setValue(objTratamiento.nPrecio);
    }
  }

  saveAtencion(): void {
    if (this.form.invalid) {
      return Object.values(this.form.controls).forEach(control => { control.markAllAsTouched() });
    }
    if (this.isEmpty) {
      this.alert.showMessage('warning', 'Seleccione al menos un tratamiento');
      return;
    }
    this.atencionHttp.sendAtencionCreate(this.form.getRawValue()).subscribe(
      res => {
        if (res) {
          this.alert.showToast('success');
          this.goAtencionListado();
        }
        else this.alert.showMessage('error')
      }
    );
  }

  getMontoTotal() {
    return (this.detAtencionArray.getRawValue() as any[])
      .map(item => +item.nPrecio * +item.nCantidad)
      .reduce((acc, value) => acc + value, 0);
  }

  // private addRow(tratamiento: Tratamiento): void {
  //   this.detAtencionArray.push(
  //     this.fb.group({
  //       nIdTratamiento: tratamiento.nIdTratamiento,
  //       sNombre: tratamiento.sNombre,
  //       nCantidad: 1,
  //       nPrecio: tratamiento.nPrecio
  //     }));
  // }

  // getTratamientos(): void {
  //   this.alert.showLoading();
  //   this.tratamientoHttp
  //     .getTratamientoSearch()
  //     .pipe(finalize(() => this.alert.closeLoading()))
  //     .subscribe(res => this.chooseTratamiento(res));
  // }

  // chooseTratamiento(tratamientos: Tratamiento[]): void {
  //   this.dialog.open(DialogTratamientoChooseComponent, {
  //     width: '600px',
  //     data: { 'tratamientos': tratamientos }
  //   }).afterClosed()
  //     .subscribe((result: Tratamiento[]) => {
  //       if (result) {
  //         result.forEach(item => this.addRow(item));
  //         this.dataSource = new MatTableDataSource(this.detAtencionArray.controls);
  //       }
  //     });
  // }
}

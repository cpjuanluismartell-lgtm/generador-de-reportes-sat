import { CFDI } from './cfdiParser';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import * as XLSX from 'xlsx';

export interface ProcessedData {
    emitidas: CFDI[];
    recibidas: CFDI[];
    pagosRecibidos: CFDI[];
    pagosEmitidos: CFDI[];
    notasCreditoRecibidas: CFDI[];
    notasCreditoEmitidas: CFDI[];
    nominaRecibida: CFDI[];
    nominaEmitida: CFDI[];
}

export function generateExcel(data: ProcessedData) {
    let userName = '';
    let reportDate = new Date();

    const allData = [
        ...data.emitidas, ...data.notasCreditoEmitidas, ...data.pagosEmitidos, ...data.nominaEmitida,
        ...data.recibidas, ...data.notasCreditoRecibidas, ...data.pagosRecibidos, ...data.nominaRecibida
    ];

    if (allData.length > 0) {
        const firstEmitida = [...data.emitidas, ...data.notasCreditoEmitidas, ...data.pagosEmitidos, ...data.nominaEmitida][0];
        const firstRecibida = [...data.recibidas, ...data.notasCreditoRecibidas, ...data.pagosRecibidos, ...data.nominaRecibida][0];
        
        if (firstEmitida) {
            userName = firstEmitida.nombreEmisor;
            const parsedDate = parseISO(firstEmitida.fecha);
            if (isValid(parsedDate)) reportDate = parsedDate;
        } else if (firstRecibida) {
            userName = firstRecibida.nombreReceptor;
            const parsedDate = parseISO(firstRecibida.fecha);
            if (isValid(parsedDate)) reportDate = parsedDate;
        }
    }

    const monthYear = format(reportDate, 'MMMM yyyy', { locale: es }).toUpperCase();
    const wsData: any[][] = [];

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const parsed = parseISO(dateStr);
        return isValid(parsed) ? format(parsed, 'dd/MM/yyyy') : dateStr;
    };

    // --- EMITIDAS ---
    if (data.emitidas.length > 0) {
        wsData.push([`REPORTE FACTURAS EMITIDAS ${userName} ${monthYear}`]);
        wsData.push(['UUID', 'RFC Receptor', 'Nombre Receptor', 'SubTotal', 'IVA 16%', 'Retenido IVA', 'Retenido ISR', 'Total', 'Estado SAT', 'Fecha Emision']);
        
        let sumSub = 0, sumIva = 0, sumRetIva = 0, sumRetIsr = 0, sumTotal = 0;
        data.emitidas.forEach(cfdi => {
            wsData.push([cfdi.uuid, cfdi.rfcReceptor, cfdi.nombreReceptor, cfdi.subTotal, cfdi.iva16, cfdi.retIva, cfdi.retIsr, cfdi.total, cfdi.estadoSat, formatDate(cfdi.fecha)]);
            sumSub += cfdi.subTotal; sumIva += cfdi.iva16; sumRetIva += cfdi.retIva; sumRetIsr += cfdi.retIsr; sumTotal += cfdi.total;
        });
        wsData.push(['', '', '', sumSub, sumIva, sumRetIva, sumRetIsr, sumTotal, '', '']);
        wsData.push([]); wsData.push([]);
    }

    // --- RECIBIDAS ---
    if (data.recibidas.length > 0) {
        wsData.push([`REPORTE FACTURAS RECIBIDAS ${userName} ${monthYear}`]);
        wsData.push(['UUID', 'RFC Emisor', 'Nombre Emisor', 'SubTotal', 'Descuento', 'IVA 16%', 'Total', 'Estado SAT', 'Fecha Emision']);
        
        let sumSub = 0, sumDesc = 0, sumIva = 0, sumTotal = 0;
        data.recibidas.forEach(cfdi => {
            wsData.push([cfdi.uuid, cfdi.rfcEmisor, cfdi.nombreEmisor, cfdi.subTotal, cfdi.descuento, cfdi.iva16, cfdi.total, cfdi.estadoSat, formatDate(cfdi.fecha)]);
            sumSub += cfdi.subTotal; sumDesc += cfdi.descuento; sumIva += cfdi.iva16; sumTotal += cfdi.total;
        });
        wsData.push(['', '', '', sumSub, sumDesc, sumIva, sumTotal, '', '']);
        wsData.push([]); wsData.push([]);
    }

    // --- NOTAS DE CREDITO EMITIDAS ---
    if (data.notasCreditoEmitidas.length > 0) {
        wsData.push([`REPORTE NOTAS DE CREDITO EMITIDAS ${userName} ${monthYear}`]);
        wsData.push(['UUID', 'UUID Relacion', 'RFC Receptor', 'Nombre Receptor', 'SubTotal', 'Descuento', 'Total IEPS', 'IVA 16%', 'Total', 'Estado SAT', 'Fecha Emision']);
        
        let sumSub = 0, sumDesc = 0, sumIeps = 0, sumIva = 0, sumTotal = 0;
        data.notasCreditoEmitidas.forEach(cfdi => {
            wsData.push([cfdi.uuid, cfdi.uuidRel, cfdi.rfcReceptor, cfdi.nombreReceptor, cfdi.subTotal, cfdi.descuento, cfdi.ieps, cfdi.iva16, cfdi.total, cfdi.estadoSat, formatDate(cfdi.fecha)]);
            sumSub += cfdi.subTotal; sumDesc += cfdi.descuento; sumIeps += cfdi.ieps; sumIva += cfdi.iva16; sumTotal += cfdi.total;
        });
        wsData.push(['', '', '', '', sumSub, sumDesc, sumIeps, sumIva, sumTotal, '', '']);
        wsData.push([]); wsData.push([]);
    }

    // --- NOTAS DE CREDITO RECIBIDAS ---
    if (data.notasCreditoRecibidas.length > 0) {
        wsData.push([`REPORTE NOTAS DE CREDITO RECIBIDAS ${userName} ${monthYear}`]);
        wsData.push(['UUID', 'UUID Relacion', 'RFC Emisor', 'Nombre Emisor', 'SubTotal', 'Descuento', 'Total IEPS', 'IVA 16%', 'Total', 'Estado SAT', 'Fecha Emision']);
        
        let sumSub = 0, sumDesc = 0, sumIeps = 0, sumIva = 0, sumTotal = 0;
        data.notasCreditoRecibidas.forEach(cfdi => {
            wsData.push([cfdi.uuid, cfdi.uuidRel, cfdi.rfcEmisor, cfdi.nombreEmisor, cfdi.subTotal, cfdi.descuento, cfdi.ieps, cfdi.iva16, cfdi.total, cfdi.estadoSat, formatDate(cfdi.fecha)]);
            sumSub += cfdi.subTotal; sumDesc += cfdi.descuento; sumIeps += cfdi.ieps; sumIva += cfdi.iva16; sumTotal += cfdi.total;
        });
        wsData.push(['', '', '', '', sumSub, sumDesc, sumIeps, sumIva, sumTotal, '', '']);
        wsData.push([]); wsData.push([]);
    }

    // --- NOMINA EMITIDA ---
    if (data.nominaEmitida.length > 0) {
        wsData.push([`REPORTE NOMINA EMITIDA ${userName} ${monthYear}`]);
        wsData.push(['UUID', 'SubTotal', 'Descuento', 'ISR XML', 'Total', 'EstadoSAT', 'FechaEmision']);
        
        let sumSub = 0, sumDesc = 0, sumIsr = 0, sumTotal = 0;
        data.nominaEmitida.forEach(cfdi => {
            wsData.push([cfdi.uuid, cfdi.subTotal, cfdi.descuento, cfdi.isrNomina, cfdi.total, cfdi.estadoSat, formatDate(cfdi.fecha)]);
            sumSub += cfdi.subTotal; sumDesc += cfdi.descuento; sumIsr += cfdi.isrNomina; sumTotal += cfdi.total;
        });
        wsData.push(['', sumSub, sumDesc, sumIsr, sumTotal, '', '']);
        wsData.push([]); wsData.push([]);
    }

    // --- NOMINA RECIBIDA ---
    if (data.nominaRecibida.length > 0) {
        wsData.push([`REPORTE NOMINA RECIBIDA ${userName} ${monthYear}`]);
        wsData.push(['UUID', 'SubTotal', 'Descuento', 'ISR XML', 'Total', 'EstadoSAT', 'FechaEmision']);
        
        let sumSub = 0, sumDesc = 0, sumIsr = 0, sumTotal = 0;
        data.nominaRecibida.forEach(cfdi => {
            wsData.push([cfdi.uuid, cfdi.subTotal, cfdi.descuento, cfdi.isrNomina, cfdi.total, cfdi.estadoSat, formatDate(cfdi.fecha)]);
            sumSub += cfdi.subTotal; sumDesc += cfdi.descuento; sumIsr += cfdi.isrNomina; sumTotal += cfdi.total;
        });
        wsData.push(['', sumSub, sumDesc, sumIsr, sumTotal, '', '']);
        wsData.push([]); wsData.push([]);
    }

    // --- PAGOS EMITIDOS ---
    if (data.pagosEmitidos.length > 0) {
        wsData.push([`REPORTE PAGOS EMITIDOS ${userName} ${monthYear}`]);
        wsData.push(['UUID', 'RFC Receptor', 'Nombre Receptor', 'Monto', 'UUIDRel', 'Total', 'Estado SAT', 'Fecha Emision']);
        
        let sumMonto = 0, sumTotal = 0;
        data.pagosEmitidos.forEach(cfdi => {
            wsData.push([cfdi.uuid, cfdi.rfcReceptor, cfdi.nombreReceptor, cfdi.montoPago, cfdi.uuidRel, cfdi.total, cfdi.estadoSat, formatDate(cfdi.fecha)]);
            sumMonto += cfdi.montoPago; sumTotal += cfdi.total;
        });
        wsData.push(['', '', '', sumMonto, '', sumTotal, '', '']);
        wsData.push([]); wsData.push([]);
    }

    // --- PAGOS RECIBIDOS ---
    if (data.pagosRecibidos.length > 0) {
        wsData.push([`REPORTE PAGOS RECIBIDOS ${userName} ${monthYear}`]);
        wsData.push(['UUID', 'RFC Emisor', 'Nombre Emisor', 'Monto', 'UUIDRel', 'Total', 'Estado SAT', 'Fecha Emision']);
        
        let sumMonto = 0, sumTotal = 0;
        data.pagosRecibidos.forEach(cfdi => {
            wsData.push([cfdi.uuid, cfdi.rfcEmisor, cfdi.nombreEmisor, cfdi.montoPago, cfdi.uuidRel, cfdi.total, cfdi.estadoSat, formatDate(cfdi.fecha)]);
            sumMonto += cfdi.montoPago; sumTotal += cfdi.total;
        });
        wsData.push(['', '', '', sumMonto, '', sumTotal, '', '']);
        wsData.push([]); wsData.push([]);
    }

    // --- PIVOT TABLE (Resumen Recibidas) ---
    if (data.recibidas.length > 0) {
        wsData.push(['Nombre Emisor', 'RFC Emisor', 'SubTotal', 'Descuento', 'IVA 16%', 'Total']);
        
        const summary: Record<string, any> = {};
        data.recibidas.forEach(cfdi => {
            const key = cfdi.rfcEmisor;
            if (!summary[key]) {
                summary[key] = { nombre: cfdi.nombreEmisor, rfc: cfdi.rfcEmisor, subTotal: 0, descuento: 0, iva16: 0, total: 0 };
            }
            summary[key].subTotal += cfdi.subTotal;
            summary[key].descuento += cfdi.descuento;
            summary[key].iva16 += cfdi.iva16;
            summary[key].total += cfdi.total;
        });

        let sumSub = 0, sumDesc = 0, sumIva = 0, sumTotal = 0;
        Object.values(summary).forEach(row => {
            wsData.push([row.nombre, row.rfc, row.subTotal, row.descuento, row.iva16, row.total]);
            sumSub += row.subTotal; sumDesc += row.descuento; sumIva += row.iva16; sumTotal += row.total;
        });
        wsData.push(['Total general', '', sumSub, sumDesc, sumIva, sumTotal]);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte SAT");
    XLSX.writeFile(wb, `Reporte_SAT_${monthYear.replace(' ', '_')}.xlsx`);
}

export interface CFDI {
  uuid: string;
  tipoDeComprobante: string;
  fecha: string;
  subTotal: number;
  total: number;
  descuento: number;
  rfcEmisor: string;
  nombreEmisor: string;
  rfcReceptor: string;
  nombreReceptor: string;
  iva16: number;
  retIva: number;
  retIsr: number;
  montoPago: number;
  uuidRel: string;
  estadoSat: string;
}

export function parseCFDI(xmlString: string): CFDI | null {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");

  const getAttr = (node: Element | null, attr: string) => node ? node.getAttribute(attr) : null;

  const comprobante = xmlDoc.getElementsByTagName('cfdi:Comprobante')[0];
  if (!comprobante) return null;

  const emisor = xmlDoc.getElementsByTagName('cfdi:Emisor')[0];
  const receptor = xmlDoc.getElementsByTagName('cfdi:Receptor')[0];
  const timbre = xmlDoc.getElementsByTagName('tfd:TimbreFiscalDigital')[0];

  const tipoDeComprobante = getAttr(comprobante, 'TipoDeComprobante') || '';
  const uuid = getAttr(timbre, 'UUID') || '';
  const fecha = getAttr(comprobante, 'Fecha') || '';
  const subTotal = parseFloat(getAttr(comprobante, 'SubTotal') || '0');
  const total = parseFloat(getAttr(comprobante, 'Total') || '0');
  const descuento = parseFloat(getAttr(comprobante, 'Descuento') || '0');

  const rfcEmisor = getAttr(emisor, 'Rfc') || '';
  const nombreEmisor = getAttr(emisor, 'Nombre') || '';
  const rfcReceptor = getAttr(receptor, 'Rfc') || '';
  const nombreReceptor = getAttr(receptor, 'Nombre') || '';

  let iva16 = 0;
  let retIva = 0;
  let retIsr = 0;

  const impuestosNodes = xmlDoc.getElementsByTagName('cfdi:Impuestos');
  let globalImpuestos: Element | null = null;
  for(let i=0; i<impuestosNodes.length; i++) {
     if(impuestosNodes[i].parentNode === comprobante) {
         globalImpuestos = impuestosNodes[i];
         break;
     }
  }

  if (globalImpuestos) {
      const traslados = globalImpuestos.getElementsByTagName('cfdi:Traslado');
      for(let i=0; i<traslados.length; i++) {
          const imp = getAttr(traslados[i], 'Impuesto');
          const tasa = getAttr(traslados[i], 'TasaOCuota');
          const importe = parseFloat(getAttr(traslados[i], 'Importe') || '0');
          if (imp === '002' && tasa === '0.160000') {
              iva16 += importe;
          }
      }

      const retenciones = globalImpuestos.getElementsByTagName('cfdi:Retencion');
      for(let i=0; i<retenciones.length; i++) {
          const imp = getAttr(retenciones[i], 'Impuesto');
          const importe = parseFloat(getAttr(retenciones[i], 'Importe') || '0');
          if (imp === '002') retIva += importe;
          if (imp === '001') retIsr += importe;
      }
  }

  let montoPago = 0;
  let uuidRel = '';
  if (tipoDeComprobante === 'P') {
      const pago10 = xmlDoc.getElementsByTagName('pago10:Pago');
      const pago20 = xmlDoc.getElementsByTagName('pago20:Pago');
      const pagos = pago20.length > 0 ? pago20 : pago10;
      
      let uuids: string[] = [];
      for(let p=0; p<pagos.length; p++) {
          montoPago += parseFloat(getAttr(pagos[p], 'Monto') || '0');
          const doctos = pagos[p].getElementsByTagName('pago20:DoctoRelacionado');
          const doctos10 = pagos[p].getElementsByTagName('pago10:DoctoRelacionado');
          const allDoctos = doctos.length > 0 ? doctos : doctos10;
          for(let i=0; i<allDoctos.length; i++) {
              const id = getAttr(allDoctos[i], 'IdDocumento');
              if (id) uuids.push(id);
          }
      }
      uuidRel = uuids.join(', ');
  }

  return {
      uuid: uuid.toUpperCase(),
      tipoDeComprobante,
      fecha,
      subTotal,
      total,
      descuento,
      rfcEmisor,
      nombreEmisor,
      rfcReceptor,
      nombreReceptor,
      iva16,
      retIva,
      retIsr,
      montoPago,
      uuidRel,
      estadoSat: 'Vigente' // Default if no metadata
  };
}

export function parseMetadata(txtString: string): Record<string, string> {
    const lines = txtString.split('\n');
    const metadata: Record<string, string> = {};
    if (lines.length === 0) return metadata;

    const separator = lines[0].includes('~') ? '~' : (lines[0].includes('|') ? '|' : ',');
    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
    
    const uuidIdx = headers.findIndex(h => h.includes('uuid'));
    const estatusIdx = headers.findIndex(h => h.includes('estatus') || h.includes('estado'));

    if (uuidIdx === -1 || estatusIdx === -1) {
        // Fallback: try to find UUID pattern and 1/0 or Vigente/Cancelado
        const uuidRegex = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;
        for (let i = 0; i < lines.length; i++) {
            const cols = lines[i].split(separator);
            let foundUuid = '';
            let foundEstatus = 'Vigente';
            for (const col of cols) {
                const cleanCol = col.trim();
                if (uuidRegex.test(cleanCol)) {
                    foundUuid = cleanCol.toUpperCase();
                } else if (cleanCol === '0' || cleanCol.toLowerCase() === 'cancelado') {
                    foundEstatus = 'Cancelado';
                } else if (cleanCol === '1' || cleanCol.toLowerCase() === 'vigente') {
                    foundEstatus = 'Vigente';
                }
            }
            if (foundUuid) {
                metadata[foundUuid] = foundEstatus;
            }
        }
        return metadata;
    }

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(separator);
        if (cols.length > Math.max(uuidIdx, estatusIdx)) {
            const uuid = cols[uuidIdx].trim().toUpperCase();
            const estatus = cols[estatusIdx].trim();
            metadata[uuid] = estatus === '1' ? 'Vigente' : (estatus === '0' ? 'Cancelado' : estatus);
        }
    }
    return metadata;
}

import { useState } from 'react';
import { FileUp, FolderUp, FileSpreadsheet, Loader2, RotateCcw } from 'lucide-react';
import { CFDI, parseCFDI, parseMetadata } from './lib/cfdiParser';
import { generateExcel } from './lib/excelGenerator';

export default function App() {
  const [inputKey, setInputKey] = useState(Date.now());
  
  const [emitidasFiles, setEmitidasFiles] = useState<FileList | null>(null);
  const [emitidasMeta, setEmitidasMeta] = useState<File | null>(null);
  
  const [recibidasFiles, setRecibidasFiles] = useState<FileList | null>(null);
  const [recibidasMeta, setRecibidasMeta] = useState<File | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<{ emitidas: CFDI[], recibidas: CFDI[], pagos: CFDI[] } | null>(null);

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const handleClear = () => {
    setEmitidasFiles(null);
    setEmitidasMeta(null);
    setRecibidasFiles(null);
    setRecibidasMeta(null);
    setProcessedData(null);
    setInputKey(Date.now()); // Resets all file inputs
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      const emitidas: CFDI[] = [];
      const recibidas: CFDI[] = [];
      const pagos: CFDI[] = [];

      let emitidasMetadata: Record<string, string> = {};
      if (emitidasMeta) {
        const text = await readFileAsText(emitidasMeta);
        emitidasMetadata = parseMetadata(text);
      }

      let recibidasMetadata: Record<string, string> = {};
      if (recibidasMeta) {
        const text = await readFileAsText(recibidasMeta);
        recibidasMetadata = parseMetadata(text);
      }

      if (emitidasFiles) {
        for (let i = 0; i < emitidasFiles.length; i++) {
          const file = emitidasFiles[i];
          if (file.name.toLowerCase().endsWith('.xml')) {
            const xml = await readFileAsText(file);
            const cfdi = parseCFDI(xml);
            if (cfdi) {
              if (emitidasMetadata[cfdi.uuid]) {
                cfdi.estadoSat = emitidasMetadata[cfdi.uuid];
              }
              if (cfdi.tipoDeComprobante === 'I' || cfdi.tipoDeComprobante === 'E') {
                emitidas.push(cfdi);
              } else if (cfdi.tipoDeComprobante === 'P') {
                // Pagos emitidos (opcional, pero los agregamos a pagos si es necesario)
                // El reporte de ejemplo muestra "PAGOS RECIBIDOS" con RFC Emisor = Banco.
                // Eso significa que son CFDI tipo P que el usuario RECIBIÓ.
              }
            }
          }
        }
      }

      if (recibidasFiles) {
        for (let i = 0; i < recibidasFiles.length; i++) {
          const file = recibidasFiles[i];
          if (file.name.toLowerCase().endsWith('.xml')) {
            const xml = await readFileAsText(file);
            const cfdi = parseCFDI(xml);
            if (cfdi) {
              if (recibidasMetadata[cfdi.uuid]) {
                cfdi.estadoSat = recibidasMetadata[cfdi.uuid];
              }
              if (cfdi.tipoDeComprobante === 'I' || cfdi.tipoDeComprobante === 'E') {
                recibidas.push(cfdi);
              } else if (cfdi.tipoDeComprobante === 'P') {
                pagos.push(cfdi);
              }
            }
          }
        }
      }

      setProcessedData({ emitidas, recibidas, pagos });
    } catch (error) {
      console.error("Error processing files:", error);
      alert("Hubo un error al procesar los archivos. Revisa la consola para más detalles.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    if (processedData) {
      generateExcel(processedData.emitidas, processedData.recibidas, processedData.pagos);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Generador de Reportes SAT</h1>
          <p className="text-gray-500">Procesa tus XMLs y genera un reporte en Excel</p>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Emitidas Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FolderUp className="w-5 h-5 text-blue-600" />
              Facturas Emitidas
            </h2>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Carpeta de XMLs</label>
              <input 
                key={`emitidas-dir-${inputKey}`}
                type="file" 
                // @ts-ignore
                webkitdirectory="true" 
                directory="true" 
                multiple 
                onChange={(e) => setEmitidasFiles(e.target.files)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {emitidasFiles && <p className="text-xs text-gray-500">{emitidasFiles.length} archivos seleccionados</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Archivo Metadata .txt (Opcional)</label>
              <input 
                key={`emitidas-meta-${inputKey}`}
                type="file" 
                accept=".txt"
                onChange={(e) => setEmitidasMeta(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
              />
            </div>
          </div>

          {/* Recibidas Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FolderUp className="w-5 h-5 text-green-600" />
              Facturas Recibidas
            </h2>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Carpeta de XMLs</label>
              <input 
                key={`recibidas-dir-${inputKey}`}
                type="file" 
                // @ts-ignore
                webkitdirectory="true" 
                directory="true" 
                multiple 
                onChange={(e) => setRecibidasFiles(e.target.files)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
              {recibidasFiles && <p className="text-xs text-gray-500">{recibidasFiles.length} archivos seleccionados</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Archivo Metadata .txt (Opcional)</label>
              <input 
                key={`recibidas-meta-${inputKey}`}
                type="file" 
                accept=".txt"
                onChange={(e) => setRecibidasMeta(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button 
            onClick={handleClear}
            disabled={isProcessing || (!emitidasFiles && !recibidasFiles && !processedData)}
            className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            Limpiar
          </button>
          <button 
            onClick={handleProcess}
            disabled={isProcessing || (!emitidasFiles && !recibidasFiles)}
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileUp className="w-5 h-5" />}
            Procesar Archivos
          </button>
        </div>

        {processedData && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Resumen del Proceso</h2>
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md font-medium hover:bg-green-700 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Exportar a Excel
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">{processedData.emitidas.length}</p>
                <p className="text-sm text-blue-600 font-medium">Emitidas</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">{processedData.recibidas.length}</p>
                <p className="text-sm text-green-600 font-medium">Recibidas</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-700">{processedData.pagos.length}</p>
                <p className="text-sm text-purple-600 font-medium">Pagos Recibidos</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

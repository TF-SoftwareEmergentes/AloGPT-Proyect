export default function TestTailwind() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-700 to-purple-500 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">¡Tailwind Funciona!</h1>
        <p className="text-xl text-purple-100 mb-8">Si ves este gradiente púrpura, CSS está aplicado correctamente</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-red-500 p-6 rounded-lg text-white font-bold">Rojo</div>
          <div className="bg-green-500 p-6 rounded-lg text-white font-bold">Verde</div>
          <div className="bg-blue-500 p-6 rounded-lg text-white font-bold">Azul</div>
        </div>
      </div>
    </div>
  );
}

/* fotos: redimensionar en el teléfono antes de subir (máx 1200px, JPEG 82%) */

export function fileToResizedDataURL(file, max = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onerror = () => reject(new Error('No se pudo leer la foto.'))
    r.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('No se pudo procesar la foto.'))
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height))
        const cv = document.createElement('canvas')
        cv.width = Math.round(img.width * s)
        cv.height = Math.round(img.height * s)
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
        resolve(cv.toDataURL('image/jpeg', quality))
      }
      img.src = r.result
    }
    r.readAsDataURL(file)
  })
}

export function dataURLtoBlob(d) {
  const [h, b] = d.split(',')
  const mime = h.match(/:(.*?);/)[1]
  const bin = atob(b)
  const u = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i)
  return new Blob([u], { type: mime })
}

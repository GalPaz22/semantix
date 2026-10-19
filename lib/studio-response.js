export async function readStudioJson(response) {
  try { return await response.json(); }
  catch {
    // Hosting errors/restarts can return HTML or an empty response. They are
    // upstream failures, not malformed JSON sent by the signed-in customer.
    throw Object.assign(new Error('הסטודיו אינו זמין כרגע או נמצא בהפעלה מחדש. נסו לרענן בעוד רגע.'), { status: response.status >= 500 && response.status <= 599 ? response.status : 502 });
  }
}

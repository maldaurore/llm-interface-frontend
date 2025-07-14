// Listado de modelos disponibles. La estructura debe coincidir con la del tipo ModelOption.
/** @type {import('./types.js').ModelOption[]} */
export const AVAILABLE_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', type: 'model' },
  { id: 'asst_Ly6BU0FC3XtxPizI9zy6rhLs', name: 'Asistente de Asesor Fiscal', type: 'assistant' },
  { id: 'asesor-fiscal-zafirosoft-erp', name: 'Asistente de Asesor Fiscal BRAIAN', type: 'braian' },
];

export const DEFAULT_MODEL_ID = AVAILABLE_MODELS[0].id;

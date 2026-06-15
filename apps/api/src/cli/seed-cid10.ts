import { connect, connection, model, Schema } from 'mongoose';

const CID10_SCHEMA = new Schema({ codigo: { type: String, unique: true }, descricao: String });
const Cid10Model = model('Cid10', CID10_SCHEMA, 'cid10');

const CID10_DATA = [
  { codigo: 'A00', descricao: 'Colera' },
  { codigo: 'A01', descricao: 'Febres tifoide e paratifoide' },
  { codigo: 'A02', descricao: 'Outras infeccoes por Salmonella' },
  { codigo: 'A09', descricao: 'Diarreia e gastroenterite de origem infecciosa presumivel' },
  { codigo: 'A15', descricao: 'Tuberculose respiratoria' },
  { codigo: 'A36', descricao: 'Difteria' },
  { codigo: 'A37', descricao: 'Coqueluche' },
  { codigo: 'A50', descricao: 'Sifilis congenita' },
  { codigo: 'A63', descricao: 'Outras doencas de transmissao predominantemente sexual' },
  { codigo: 'A90', descricao: 'Dengue' },
  { codigo: 'A91', descricao: 'Dengue hemorragica' },
  { codigo: 'B00', descricao: 'Infeccoes pelo virus do herpes' },
  { codigo: 'B01', descricao: 'Varicela' },
  { codigo: 'B02', descricao: 'Herpes zoster' },
  { codigo: 'B05', descricao: 'Sarampo' },
  { codigo: 'B06', descricao: 'Rubeola' },
  { codigo: 'B15', descricao: 'Hepatite aguda A' },
  { codigo: 'B16', descricao: 'Hepatite aguda B' },
  { codigo: 'B18', descricao: 'Hepatite viral cronica' },
  { codigo: 'B20', descricao: 'Doenca pelo HIV resultando em doencas infecciosas e parasitarias' },
  { codigo: 'B24', descricao: 'Doenca pelo virus da imunodeficiencia humana (HIV) nao especificada' },
  { codigo: 'C18', descricao: 'Neoplasia maligna do colon' },
  { codigo: 'C34', descricao: 'Neoplasia maligna dos bronquios e dos pulmoes' },
  { codigo: 'C50', descricao: 'Neoplasia maligna da mama' },
  { codigo: 'C61', descricao: 'Neoplasia maligna da prostata' },
  { codigo: 'C67', descricao: 'Neoplasia maligna da bexiga' },
  { codigo: 'D50', descricao: 'Anemia por deficiencia de ferro' },
  { codigo: 'D64', descricao: 'Outras anemias' },
  { codigo: 'E10', descricao: 'Diabetes mellitus insulino-dependente' },
  { codigo: 'E11', descricao: 'Diabetes mellitus nao-insulino-dependente' },
  { codigo: 'E14', descricao: 'Diabetes mellitus nao especificado' },
  { codigo: 'E66', descricao: 'Obesidade' },
  { codigo: 'E78', descricao: 'Disturbios do metabolismo de lipoproteinas e outras lipidemias' },
  { codigo: 'F10', descricao: 'Transtornos mentais e comportamentais devidos ao uso de alcool' },
  { codigo: 'F20', descricao: 'Esquizofrenia' },
  { codigo: 'F32', descricao: 'Episodios depressivos' },
  { codigo: 'F33', descricao: 'Transtorno depressivo recorrente' },
  { codigo: 'F40', descricao: 'Transtornos fobico-ansiosos' },
  { codigo: 'F41', descricao: 'Outros transtornos ansiosos' },
  { codigo: 'F43', descricao: 'Reacoes ao stress grave e transtornos de adaptacao' },
  { codigo: 'G40', descricao: 'Epilepsia' },
  { codigo: 'G43', descricao: 'Enxaqueca' },
  { codigo: 'I10', descricao: 'Hipertensao essencial (primaria)' },
  { codigo: 'I20', descricao: 'Angina pectoris' },
  { codigo: 'I21', descricao: 'Infarto agudo do miocardio' },
  { codigo: 'I25', descricao: 'Doenca isquemica cronica do coracao' },
  { codigo: 'I48', descricao: 'Flutter e fibrilacao atrial' },
  { codigo: 'I50', descricao: 'Insuficiencia cardiaca' },
  { codigo: 'I63', descricao: 'Infarto cerebral' },
  { codigo: 'I64', descricao: 'Acidente vascular cerebral nao especificado como hemorragico ou isquemico' },
  { codigo: 'J00', descricao: 'Nasofaringite aguda (resfriado comum)' },
  { codigo: 'J01', descricao: 'Sinusite aguda' },
  { codigo: 'J02', descricao: 'Faringite aguda' },
  { codigo: 'J03', descricao: 'Amigdalite aguda' },
  { codigo: 'J06', descricao: 'Infeccoes agudas das vias aereas superiores de localizacoes multiplas ou nao especificadas' },
  { codigo: 'J11', descricao: 'Gripe devida a virus nao identificado' },
  { codigo: 'J18', descricao: 'Pneumonia por microrganismo nao especificado' },
  { codigo: 'J20', descricao: 'Bronquite aguda' },
  { codigo: 'J44', descricao: 'Outras doencas pulmonares obstrutivas cronicas' },
  { codigo: 'J45', descricao: 'Asma' },
  { codigo: 'K21', descricao: 'Doenca de refluxo gastroesofagico' },
  { codigo: 'K29', descricao: 'Gastrite e duodenite' },
  { codigo: 'K35', descricao: 'Apendicite aguda' },
  { codigo: 'K40', descricao: 'Hernia inguinal' },
  { codigo: 'K57', descricao: 'Doenca diverticular do intestino' },
  { codigo: 'K80', descricao: 'Colelitíase' },
  { codigo: 'K92', descricao: 'Outras doencas do aparelho digestivo' },
  { codigo: 'L20', descricao: 'Dermatite atopica' },
  { codigo: 'L30', descricao: 'Outras dermatites' },
  { codigo: 'M05', descricao: 'Artrite reumatoide soropositiva' },
  { codigo: 'M10', descricao: 'Gota' },
  { codigo: 'M17', descricao: 'Gonartrose (artrose do joelho)' },
  { codigo: 'M54', descricao: 'Dorsalgia' },
  { codigo: 'M79', descricao: 'Outros transtornos dos tecidos moles' },
  { codigo: 'N18', descricao: 'Doenca renal cronica' },
  { codigo: 'N20', descricao: 'Calculo do rim e do ureter' },
  { codigo: 'N39', descricao: 'Outros transtornos do trato urinario' },
  { codigo: 'N40', descricao: 'Hiperplasia da prostata' },
  { codigo: 'O00', descricao: 'Gravidez ectopica' },
  { codigo: 'O80', descricao: 'Parto unico espontaneo' },
  { codigo: 'R00', descricao: 'Anormalidades do batimento cardiaco' },
  { codigo: 'R05', descricao: 'Tosse' },
  { codigo: 'R07', descricao: 'Dor de garganta e no peito' },
  { codigo: 'R10', descricao: 'Dor abdominal e pelvica' },
  { codigo: 'R50', descricao: 'Febre de causa desconhecida' },
  { codigo: 'R51', descricao: 'Cefaleia' },
  { codigo: 'S00', descricao: 'Traumatismo superficial da cabeca' },
  { codigo: 'S72', descricao: 'Fratura do femur' },
  { codigo: 'T14', descricao: 'Traumatismo de regiao nao especificada do corpo' },
  { codigo: 'U07', descricao: 'COVID-19' },
  { codigo: 'Z00', descricao: 'Exame geral e investigacao de pessoas sem queixas e sem diagnostico relatado' },
  { codigo: 'Z34', descricao: 'Supervisao de gravidez normal' },
  { codigo: 'Z76', descricao: 'Pessoas que recorrem aos servicos de saude em outras circunstancias' },
];

async function seed() {
  const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/nuvita';
  await connect(uri);

  let inseridos = 0;
  let ignorados = 0;

  for (const entry of CID10_DATA) {
    try {
      await Cid10Model.updateOne({ codigo: entry.codigo }, { $setOnInsert: entry }, { upsert: true });
      inseridos++;
    } catch {
      ignorados++;
    }
  }

  console.log(`CID-10 seed concluido: ${inseridos} registros, ${ignorados} ignorados.`);
  await connection.close();
}

void seed();

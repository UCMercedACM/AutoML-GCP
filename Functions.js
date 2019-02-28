// GCP Cloud Function
const automl = require('@google-cloud/automl').v1beta1; // v2.4.2
const {Storage} = require('@google-cloud/storage'); // v0.1.3
const admin = require('firebase-admin'); // v7.0.0

admin.initializeApp();
let db = admin.firestore();
const storage = new Storage();
const myBucket = storage.bucket('YOUR-BUCKET-VCM');

const client = new automl.PredictionServiceClient(); // gcloud auth application-default login

const projectId = 'YOUR-PROJECT-ID'; // the id for your cl
const computeRegion = 'us-central1';
const modelId = 'YOUR-PREDICTION-ICN'; // you can find this after your model has finished training
const scoreThreshold = '0.5';

const modelFullId = client.modelPath(projectId, computeRegion, modelId);

exports.predictSkills = (data, context) =>  {
  console.log(`Processing file: ${data.name}`);
  const name = data.name;
  const content = `gs://YOUR-BUCKET-VCM/${data.name}`; // the name of your cloud storage bucket
  const file = myBucket.file(data.name);
  
  const params = {};

  if (scoreThreshold) {
    params.score_threshold = scoreThreshold;
  }

  file.download().then(imageData => {
    const image = imageData[0];
    const buffer = image.toString('base64');
    const payload = {};
    payload.image = {
      imageBytes: buffer
    };
    
    let displayName, score;
  
    async function Predict() {
      const [response] = await client.predict({
        name: modelFullId,
        payload: payload,
        params: params,
      });

      console.log(`Prediction results:`);
      response.payload.forEach(result => {
        console.log(`Predicted class name: ${result.displayName}`);
        displayName = result.displayName;
        console.log(`Predicted class score: ${result.classification.score}`);
        score = result.classification.score;
      });
      
      let docRef = db.collection('YOUR-COLLECTION_-NAME').doc(name); // the name of your collection in firestore
      let setPrediction = docRef.set({
        date: new Date(),
        displayName: displayName,
        file: content,
        score: score
      });
      
    }
    
    Predict();
  });
};

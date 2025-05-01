//using react
import React, { useEffect, useRef, useState } from 'react';
//loading an ssd(single shot detection model pre trained with  coco dataset)
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import './ObjectDetection.css'; // Import the CSS file
// here we are declaring all da variables that we gon use
function ObjectDetection() {
  const videoRef = useRef(null);
  const [model, setModel] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [objectDurations, setObjectDurations] = useState({});
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [totalTime, setTotalTime] = useState(0); // x
  const [phoneTime, setPhoneTime] = useState(0); // y
  // waiting for the model to load cauz if we didnt, all other value load first and it wont work
  useEffect(() => {
    const loadModel = async () => {
      const loadedModel = await cocoSsd.load();
      setModel(loadedModel);
    };
    loadModel();
  }, []);
  //setupcamera ... ig its pretty selfexplanatory
  useEffect(() => {
    const setupCamera = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      videoRef.current.srcObject = stream;
    };
    setupCamera();
  }, []);
  //&& logic works jus like and logic gate, it checks if BOTH shit has loaded and only then it will give  A Green Flagg
  useEffect(() => {
    if (model && videoRef.current) {
      videoRef.current.onloadedmetadata = () => {
        const detectObjects = async () => {
          if (videoRef.current.readyState === 4) {
            const newPredictions = await model.detect(videoRef.current);
            setPredictions(newPredictions);
          }
          requestAnimationFrame(detectObjects);
        };
        detectObjects();
      };
    }
  }, [model]);

  // This function, jo iske neeche hai... is responsible for updating the total elapsed time and duration of each detected object in the video stream.

  // It is called periodically (every second) to ensure accuracy of tracking time.

  // First, the function gets the current time (`currentTime`) in milliseconds and converts the result to seconds by subtracting
  // `currentTime` from `lastUpdateTime` to calculate the elapsed time since the last update (`elapsedSeconds`) and then updates
  // `lastUpdateTime` to the current time to prepare for the next cycle.

  // The function adds `elapsedSeconds` to the total time (`totalTime`) that the video stream has been analyzed. It then copies
  // the current object duration (`objectDurations`) to modify.

  // The operation is then repeated on each detected object in `predictions`. For each object, it checks if the object class
  // has been detected before by searching its class name in `currentDurations`. If the object class is new (not in
  // `currentDurations`), its duration is initialized to 0. `elapsedSeconds` is added to the duration of the known object.

  // If the detected object is a "cell phone", `elapsedSeconds` is also added to the `phoneTime` state.

  // Finally, the function updates the `objectDurations` state using the modified `currentDurations` object. This ensures that
  // the application keeps track of how long each object (e.g., "person", "cell phone") was detected in the video stream,
  // as well as the total time the video has been analyzed.

  useEffect(() => {
    const updateDurations = () => {
      const currentTime = Date.now();
      const elapsedSeconds = (currentTime - lastUpdateTime) / 1000; //conversion to sec from milli
      setLastUpdateTime(currentTime);

      setTotalTime((prevTime) => prevTime + elapsedSeconds);

      const currentDurations = { ...objectDurations };
      predictions.forEach((prediction) => {
        const className = prediction.class;
        if (!currentDurations[className]) {
          currentDurations[className] = 0;
        }
        currentDurations[className] += elapsedSeconds;

        if (prediction.class === 'cell phone') {
          setPhoneTime((prevTime) => prevTime + elapsedSeconds);
        }
      });

      setObjectDurations(currentDurations);
    };

    const intervalId = setInterval(updateDurations, 1000);

    return () => clearInterval(intervalId);
  }, [predictions, objectDurations, lastUpdateTime]);

  //
  useEffect(() => {
    if (videoRef.current && videoRef.current.readyState === 4) {
      //checking if ready
      const canvas = document.getElementById('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
    }
  }, [videoRef.current && videoRef.current.readyState]);
  // This useEffect hook runs whenever the `predictions` array is updated.
  // It clears the previous drawing on the canvas and then redraws the bounding boxes for each detected object in the video stream.
  useEffect(() => {
    if (predictions.length > 0) {
      const canvas = document.getElementById('canvas');
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      //algnmnet dekh re bounding box aur video frame ki
      const scaleX = canvas.width / videoRef.current.videoWidth;
      const scaleY = canvas.height / videoRef.current.videoHeight;
      //prediction box
      predictions.forEach((prediction) => {
        const className = prediction.class;
        const [x, y, width, height] = prediction.bbox;
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          x * scaleX, // Scale and draw the bounding box
          y * scaleY,
          width * scaleX,
          height * scaleY
        );
        ctx.font = '18px Arial';
        ctx.fillStyle = 'red';
        ctx.fillText(
          `${className} (${Math.round(prediction.score * 100)}%)`,
          x * scaleX,
          y * scaleY > 10 ? y * scaleY - 5 : 10
        );
      });
    }
  }, [predictions]);
  //sone small function that will be later used in the last return section for DISPLAYING it
  const attentionPercentage = (phoneTime / totalTime) * 100;
  const totalAttentionInClass =
    totalTime - (attentionPercentage / 100) * totalTime;

  const totalAttentionPercentage = 100 - attentionPercentage;

  return (
    <div className="container">
      <div style={{ position: 'relative', width: 'fit-content' }}>
        <video ref={videoRef} autoPlay playsInline muted className="video" />
        <canvas id="canvas" className="canvas" />
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Object Type</th>
            <th>Duration (seconds)</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(objectDurations).map((objectType, index) => (
            <tr key={index}>
              <td>{objectType}</td>
              <td>{objectDurations[objectType].toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="stats">
        <p>Total Time: {totalTime.toFixed(2)} seconds</p>
        <p>Phone Time: {phoneTime.toFixed(2)} seconds</p>
        <p>
          Total Attention in Class: {totalAttentionInClass.toFixed(2)} seconds
        </p>
        <p>Total Attention : {totalAttentionPercentage.toFixed(2)} % </p>
      </div>
    </div>
  );
}

export default ObjectDetection;

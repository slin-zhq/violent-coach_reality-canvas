let video;
let bodyPose;
let poses = [];
let connections;
let deltaInPosition = { x: 0, y: 0 }; // To track the change in position

// Toolbar
let selectButton, confirmSelectionButton;
let sketchButton, confirmSketchButton;
let selectButtonName = "Select",
  resetButtonName = "Reset",
  sketchButtonName = "Sketch",
  confirmButtonName = "Confirm";

// Sketching states
let isSelecting = false;
let selectionConfirmed = false; // Tracks whether the selection has been confirmed
let anchor = null; // Store fixed pixel coordinates
let anchorColor = [0, 255, 0]; // Green color for the anchor
let selectedLandmarkName = null;
let previousLandmarkPosition = null; // To track the previous position of the selected landmark
let baseSketchPosition = null; // To track the base sketch position

// Drawing tools
let graphics;
let isSketching = false; // Tracks if the user is sketching
let sketchConfirmed = false; // Tracks if the sketch has been confirmed

function preload() {
  // Load the bodyPose model
  bodyPose = ml5.bodyPose("BlazePose");
}

function setup() {
  createCanvas(960, 720);

  // Create the video and hide it
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide();

  // Start detecting poses in the webcam video
  bodyPose.detectStart(video, gotPoses);

  // Get the skeleton connection information
  connections = bodyPose.getSkeleton();

  setupToolbar();
}

function setupToolbar() {
  setupSelection(); // Setup the selection buttons
  setupSketching(); // Setup the sketching buttons
}

function setupSelection() {
  // Create "Select/Reset selection" button
  selectButton = createButton("Select");
  selectButton.position(10, height + 10);
  selectButton.mousePressed(() => {
    if (selectButton.html() === selectButtonName) {
      isSelecting = true;
      anchor = null; // Reset any fixed anchor
      selectedLandmarkName = null; // Reset landmark selection
      selectionConfirmed = false; // Reset confirmation state
      previousLandmarkPosition = null; // Reset previous landmark position
      selectButton.html(resetButtonName); // Rename the button
      confirmSelectionButton.show(); // Show the confirm button
      updateConfirmSelectionButtonState(); // Update the confirm button state
    } else {
      isSelecting = false;
      anchor = null; // Allow the anchor to move again
      console.log("Selection reset.");
      selectButton.html(selectButtonName); // Change the button name back to "Select"
      updateConfirmSelectionButtonState(); // Update the confirm button state
    }
  });

  // Create "Confirm" button
  confirmSelectionButton = createButton("Confirm selection");
  confirmSelectionButton.position(150, height + 10);
  confirmSelectionButton.mousePressed(() => {
    if (selectedLandmarkName) {
      selectionConfirmed = true; // Toggle confirmation
      console.log(`Confirmed selection: ${selectedLandmarkName}`);
      selectButton.html(selectButtonName); // Change the button name back to "Select"
      selectButton.hide(); // Hide the selection button when confirmed
      isSelecting = false; // Stop selecting after confirmation
      confirmSelectionButton.hide(); // Hide the confirm button when confirmed
      sketchButton.show(); // Show the sketch button after selection
    } else {
      console.log("No landmark selected to confirm.");
    }
  });
  confirmSelectionButton.hide(); // Hide the button initially
}

function updateConfirmSelectionButtonState() {
  if (confirmSelectionButton) {
    if (selectedLandmarkName) {
      confirmSelectionButton.removeAttribute("disabled"); // Enable the button
    } else {
      confirmSelectionButton.attribute("disabled", "true"); // Disable the button
    }
  }
}

function setupSketching() {
  // Create "Start/Stop sketching" button
  sketchButton = createButton("Sketch");
  sketchButton.position(10, height + 10);
  sketchButton.mousePressed(() => {
    if (sketchButton.html() === sketchButtonName) {
      isSketching = true;
      sketchConfirmed = false; // Reset the confirmation state
      if (graphics) {
        graphics.clear(); // Clear the sketch if it exists
      } else {
        graphics = createGraphics(width, height);
      }
      sketchButton.html(resetButtonName);
      updateConfirmSketchButtonState();
    } else {
      isSketching = false;
      sketchConfirmed = false;
      sketchButton.html(sketchButtonName);
      graphics.clear(); // Clear the sketch
      updateConfirmSketchButtonState();
    }
  });
  sketchButton.hide(); // Hide the button initially

  // Create "Confirm sketch" button
  confirmSketchButton = createButton(confirmButtonName);
  confirmSketchButton.position(150, height + 10);
  confirmSketchButton.mousePressed(() => {
    if (isSketching) {
      console.log("Sketch confirmed.");
      sketchConfirmed = true; // Toggle confirmation
      isSketching = false; // Stop sketching after confirmation
      baseSketchPosition = { ...anchor }; // Save the base position
      sketchButton.html(sketchButtonName); // Change the button name back to "Sketch"
      confirmSketchButton.hide(); // Hide the confirm button
      selectButton.show(); // Show the selection button after sketch confirmation
      sketchButton.hide(); // Hide the sketch button after confirmation
    } else {
      console.log("No sketch to confirm.");
    }
  });
  confirmSketchButton.hide(); // Hide the button initially
}

function updateConfirmSketchButtonState() {
  if (confirmSketchButton) {
    if (isSketching) {
      confirmSketchButton.show(); // Show the button
    } else {
      confirmSketchButton.hide(); // Hide the button
    }

    if (graphics) {
      confirmSketchButton.removeAttribute("disabled"); // Enable the button
    } else {
      confirmSketchButton.attribute("disabled", "true"); // Disable the button
    }
  }
}

function draw() {
  // Draw the webcam video
  image(video, 0, 0, width, height);
  //   drawSkeleton();
  drawAnchor();
  moveAnchor();
  drawSketch();
  moveSketch();
}

function drawAnchor() {
  // If the selector is active and no fixed anchor exists, draw a moving anchor at the cursor
  if (isSelecting && !anchor) {
    fill(...anchorColor);
    noStroke();
    ellipse(mouseX, mouseY, 20);
  }

  // If a fixed anchor exists, draw it at the saved position
  if (anchor) {
    fill(...anchorColor);
    noStroke();
    ellipse(anchor.x, anchor.y, 20);
  }
}

function moveAnchor() {
  // Update anchor position dynamically if confirmed
  if (selectionConfirmed && selectedLandmarkName) {
    anchor.x += deltaInPosition.x;
    anchor.y += deltaInPosition.y;
  }
}

function drawSketch() {
  if (graphics && isSketching & mouseIsPressed) {
    graphics.stroke(255);
    graphics.strokeWeight(4);
    graphics.line(pmouseX, pmouseY, mouseX, mouseY);
  }
}

function moveSketch() {
  // Update sketch position dynamically if confirmed
  if (graphics) {
    if (sketchConfirmed) {
      const deltaX = previousLandmarkPosition.x - baseSketchPosition.x;
      const deltaY = previousLandmarkPosition.y - baseSketchPosition.y;
      push();
      translate(deltaX, deltaY); // Move the sketch relative to nose movement
      image(graphics, 0, 0);
      pop();
    } else {
      image(graphics, 0, 0); // Static sketch when unconfirmed
    }
  }
}

function doubleClicked() {
  if (isSelecting) {
    // Save the current mouse position as the fixed anchor
    anchor = { x: mouseX, y: mouseY };
    isSelecting = false; // Stop moving the anchor
    console.log(`Fixed anchor position at: (${anchor.x}, ${anchor.y})`);

    if (poses.length > 0) {
      //   console.log("doubleClicked > poses:", poses);
      selectedLandmarkName = findClosestLandmark(anchor.x, anchor.y);
      if (selectedLandmarkName) {
        console.log(`Selected landmark: ${selectedLandmarkName}`);
      } else {
        console.log("No landmark found close to the selection.");
      }
      updateConfirmSelectionButtonState(); // Update the confirm button state after landmark selection
    } else {
      console.log("No poses detected.");
    }
  }
}

function findClosestLandmark(x, y) {
  let closestDistance = Infinity;
  let closestLandmark = null;

  for (let pose of poses) {
    if (pose.keypoints) {
      for (let keypoint of pose.keypoints) {
        let distance = dist(x, y, keypoint.x, keypoint.y);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestLandmark = keypoint;
        }
      }
    }
  }

  if (!closestLandmark) {
    console.error("No closest landmark found.");
    return null;
  }
  previousLandmarkPosition = { x: closestLandmark.x, y: closestLandmark.y }; // Initialize previous position
  return closestLandmark.name;
}

function drawSkeleton() {
  // Draw the skeleton connections
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    for (let j = 0; j < connections.length; j++) {
      let pointAIndex = connections[j][0];
      let pointBIndex = connections[j][1];
      let pointA = pose.keypoints[pointAIndex];
      let pointB = pose.keypoints[pointBIndex];
      // Only draw a line if both points are confident enough
      if (pointA.confidence > 0.1 && pointB.confidence > 0.1) {
        stroke(255, 0, 0);
        strokeWeight(2);
        line(pointA.x, pointA.y, pointB.x, pointB.y);
      }
    }
  }

  // Draw all the tracked landmark points
  for (let i = 0; i < poses.length; i++) {
    let pose = poses[i];
    for (let j = 0; j < pose.keypoints.length; j++) {
      let keypoint = pose.keypoints[j];
      // Only draw a circle if the keypoint's confidence is bigger than 0.1
      if (keypoint.confidence > 0.1) {
        fill(0, 255, 0);
        noStroke();
        circle(keypoint.x, keypoint.y, 10);
      }
    }
  }
}

// Callback function for when bodyPose outputs data
function gotPoses(results) {
  // Save the output to the poses variable
  poses = results;

  // Update selected landmark position
  for (let pose of poses) {
    for (let keypoint of pose.keypoints) {
      if (keypoint.name === selectedLandmarkName) {
        const deltaX = keypoint.x - previousLandmarkPosition.x;
        const deltaY = keypoint.y - previousLandmarkPosition.y;
        deltaInPosition = { x: deltaX, y: deltaY }; // Save the delta
        // Update the previous position
        previousLandmarkPosition = { x: keypoint.x, y: keypoint.y };
        break;
      }
    }
  }
}

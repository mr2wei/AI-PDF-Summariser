
import './styles/App.css';
import React from 'react';
import Home from './pages/Home.js';

function App() {

  
  
  function sendFeedback() {
    //
  }
  
  return (
    <div className="App">

      <Home />
      
      <footer>
        <h3>This tool is still a <b>work in progress</b></h3>
        <p>Please leave some feedback on potential improvements</p>
        <form onSubmit={sendFeedback}>
          <label>
            Feedback title:
            <br />
            <input type="text" name="feedback-title" placeholder='title' />
          </label>
          <br />
          <label>
            Feedback:
            <br />
            <textarea name="feedback" placeholder='feedback' />
          </label>
          <br />
          <input type="submit" value="Submit" />
        </form>
      </footer>

    </div>
  );
}

export default App;
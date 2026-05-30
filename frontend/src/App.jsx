import { SpeedInsights } from '@vercel/speed-insights/react'
import './App.css'

function App() {
  return (
    <>
      <div className="app">
        <h1>MeshSync: Meesho Product Scraper & AI Auto-Publisher</h1>
        <p>
          Welcome to MeshSync - A premium full-stack web application that fetches product 
          listings from Meesho product links, optimizes titles/descriptions using AI, 
          auto-categorizes products, and publishes them into a beautiful local catalog.
        </p>
        <div className="card">
          <p>
            Frontend application is being set up. Please refer to the README.md for 
            complete setup instructions.
          </p>
        </div>
      </div>
      <SpeedInsights />
    </>
  )
}

export default App

'use client'

import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Use form submission instead of fetch() for proper cookie persistence
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = '/api/auth/login'
    
    const emailInput = document.createElement('input')
    emailInput.type = 'hidden'
    emailInput.name = 'email'
    emailInput.value = email
    form.appendChild(emailInput)
    
    const passwordInput = document.createElement('input')
    passwordInput.type = 'hidden'
    passwordInput.name = 'password'
    passwordInput.value = password
    form.appendChild(passwordInput)
    
    document.body.appendChild(form)
    form.submit()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-canvas">
      <div className="max-w-md w-full">
        <div className="card">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">A</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-text-primary mb-2">AlignmentOS</h2>
            <p className="text-text-secondary">Sign in to your admin account</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-warning-bg border border-warning-red/20 text-warning-red px-4 py-3 rounded-button">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block mb-2 font-semibold text-text-primary">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block mb-2 font-semibold text-text-primary">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

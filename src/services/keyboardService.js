// Create src/services/keyboardService.js
export class KeyboardService {
  static shortcuts = new Map([
    ['j', 'toggleJump'],
    ['i', 'toggleInterpolate'],
    ['ctrl+z', 'undo'],
    ['ctrl+s', 'save'],
    ['ctrl+o', 'import']
  ])
  
  static init(store) {
    document.addEventListener('keydown', (e) => {
      const key = e.ctrlKey ? `ctrl+${e.key}` : e.key.toLowerCase()
      const action = this.shortcuts.get(key)
      if (action && store[action]) {
        e.preventDefault()
        store[action]()
      }
    })
  }
}
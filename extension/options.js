const input = document.querySelector('#apiBaseUrl')
const saveBtn = document.querySelector('#save')

function load() {
  chrome.storage.sync.get({ apiBaseUrl: 'http://localhost:3000' }, ({ apiBaseUrl }) => {
    input.value = apiBaseUrl
  })
}

function save() {
  const apiBaseUrl = input.value.trim() || 'http://localhost:3000'
  chrome.storage.sync.set({ apiBaseUrl }, () => {
    saveBtn.textContent = 'Saved!'
    setTimeout(() => (saveBtn.textContent = 'Save'), 1000)
  })
}

document.addEventListener('DOMContentLoaded', load)
saveBtn.addEventListener('click', save)
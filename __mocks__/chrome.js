// Chrome API mocks for Jest testing

global.chrome = {
  runtime: {
    id: 'test-extension-id',
    getManifest: jest.fn(() => ({
      name: 'Test Extension',
      version: '1.0.0',
      manifest_version: 3
    })),
    sendMessage: jest.fn((message, callback) => {
      if (callback) callback({ success: true })
    }),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn()
    },
    onInstalled: {
      addListener: jest.fn()
    },
    getURL: jest.fn((path) => `chrome-extension://test-id/${path}`),
    lastError: null
  },
  
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        const result = Array.isArray(keys) 
          ? keys.reduce((acc, key) => ({ ...acc, [key]: null }), {})
          : { [keys]: null }
        if (callback) callback(result)
        return Promise.resolve(result)
      }),
      set: jest.fn((items, callback) => {
        if (callback) callback()
        return Promise.resolve()
      }),
      remove: jest.fn((keys, callback) => {
        if (callback) callback()
        return Promise.resolve()
      }),
      clear: jest.fn((callback) => {
        if (callback) callback()
        return Promise.resolve()
      })
    },
    sync: {
      get: jest.fn((keys, callback) => {
        const result = Array.isArray(keys) 
          ? keys.reduce((acc, key) => ({ ...acc, [key]: null }), {})
          : { [keys]: null }
        if (callback) callback(result)
        return Promise.resolve(result)
      }),
      set: jest.fn((items, callback) => {
        if (callback) callback()
        return Promise.resolve()
      }),
      remove: jest.fn((keys, callback) => {
        if (callback) callback()
        return Promise.resolve()
      }),
      clear: jest.fn((callback) => {
        if (callback) callback()
        return Promise.resolve()
      })
    }
  },
  
  tabs: {
    query: jest.fn((queryInfo, callback) => {
      const tabs = [{ id: 1, url: 'https://example.com', active: true }]
      if (callback) callback(tabs)
      return Promise.resolve(tabs)
    }),
    sendMessage: jest.fn((tabId, message, callback) => {
      if (callback) callback({ success: true })
      return Promise.resolve({ success: true })
    }),
    create: jest.fn((createProperties, callback) => {
      const tab = { id: 2, ...createProperties }
      if (callback) callback(tab)
      return Promise.resolve(tab)
    }),
    update: jest.fn((tabId, updateProperties, callback) => {
      const tab = { id: tabId, ...updateProperties }
      if (callback) callback(tab)
      return Promise.resolve(tab)
    }),
    onUpdated: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  
  contextMenus: {
    create: jest.fn((createProperties, callback) => {
      if (callback) callback()
      return 'menu-id'
    }),
    update: jest.fn((id, updateProperties, callback) => {
      if (callback) callback()
    }),
    remove: jest.fn((id, callback) => {
      if (callback) callback()
    }),
    removeAll: jest.fn((callback) => {
      if (callback) callback()
    }),
    onClicked: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  
  sidePanel: {
    open: jest.fn((options, callback) => {
      if (callback) callback()
      return Promise.resolve()
    }),
    setOptions: jest.fn((options, callback) => {
      if (callback) callback()
      return Promise.resolve()
    })
  },
  
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
    setIcon: jest.fn(),
    setTitle: jest.fn(),
    onClicked: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  
  commands: {
    onCommand: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  
  permissions: {
    contains: jest.fn((permissions, callback) => {
      if (callback) callback(true)
      return Promise.resolve(true)
    }),
    request: jest.fn((permissions, callback) => {
      if (callback) callback(true)
      return Promise.resolve(true)
    })
  }
}
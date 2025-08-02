import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import Settings from './components/Settings'
import Accounts from './components/settings/Accounts'
import WalletDetails from './components/settings/WalletDetails'
import Layout from './components/Layout'
import { EvmProvider } from './providers/EvmProvider'

function App() {
  return (
    <ChakraProvider value={defaultSystem}>
      <EvmProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="settings" element={<Settings />}>
                <Route path="accounts" element={<Accounts />} />
                <Route path="wallet-details" element={<WalletDetails />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </EvmProvider>
    </ChakraProvider>
  )
}

export default App

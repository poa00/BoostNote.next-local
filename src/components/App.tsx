import React, { useState, useEffect, useCallback } from 'react'
import Router from './Router'
import { ThemeProvider } from 'styled-components'
import { useDb } from '../lib/db'
import PreferencesModal from './PreferencesModal/PreferencesModal'
import { usePreferences } from '../lib/preferences'
import '../lib/i18n'
import CodeMirrorStyle from './CodeMirrorStyle'
import { useEffectOnce } from 'react-use'
import { useRouter } from '../lib/router'
import { values, keys } from '../lib/db/utils'
import { addIpcListener, removeIpcListener } from '../lib/electronOnly'
import { useBoostNoteProtocol } from '../lib/protocol'
import { useStorageRouter } from '../lib/storageRouter'
import ExternalStyle from './ExternalStyle'
import { selectV2Theme } from '../shared/lib/styled/styleFunctions'
import Modal from '../shared/components/organisms/Modal'
import GlobalStyle from '../shared/components/atoms/GlobalStyle'
import Dialog from '../shared/components/organisms/Dialog/Dialog'
import ContextMenu from '../shared/components/molecules/ContextMenu'
import AppNavigator from './organisms/AppNavigator'
import Toast from '../shared/components/organisms/Toast'
import styled from '../shared/lib/styled'

const LoadingText = styled.div`
  margin: 30px;
`

const AppContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  display: flex;
`

const App = () => {
  const { initialize, storageMap } = useDb()
  const { push, pathname } = useRouter()
  const [initialized, setInitialized] = useState(false)
  const { togglePreferencesModal, preferences } = usePreferences()
  const { navigate: navigateToStorage } = useStorageRouter()

  useEffectOnce(() => {
    initialize()
      .then(async (storageMap) => {
        const localSpaces = values(storageMap)

        if (
          pathname === '' ||
          pathname === '/' ||
          pathname === '/app' ||
          pathname === '/app/storages'
        ) {
          if (localSpaces.length > 0) {
            push(`/app/storages/${localSpaces[0].id}`)
          } else {
            push('/app/storages')
          }
        }
        setInitialized(true)
      })
      .catch((error) => {
        console.error(error)
      })
  })

  useEffect(() => {
    const preferencesIpcEventHandler = () => {
      togglePreferencesModal()
    }
    addIpcListener('preferences', preferencesIpcEventHandler)

    const createLocalSpaceHandler = () => {
      push('/app/storages')
    }
    addIpcListener('create-local-space', createLocalSpaceHandler)

    return () => {
      removeIpcListener('preferences', preferencesIpcEventHandler)
      removeIpcListener('create-local-space', createLocalSpaceHandler)
    }
  }, [togglePreferencesModal, push])

  const switchWorkspaceHandler = useCallback(
    (_event: any, index: number) => {
      const storageIds = keys(storageMap)

      const targetStorageId = storageIds[index]
      navigateToStorage(targetStorageId)
    },
    [storageMap, navigateToStorage]
  )

  useEffect(() => {
    addIpcListener('switch-workspace', switchWorkspaceHandler)
    return () => {
      removeIpcListener('switch-workspace', switchWorkspaceHandler)
    }
  }, [switchWorkspaceHandler])

  useBoostNoteProtocol()

  return (
    <ThemeProvider theme={selectV2Theme(preferences['general.theme'] as any)}>
      <AppContainer
        onDrop={(event: React.DragEvent) => {
          event.preventDefault()
        }}
      >
        {initialized ? (
          <>
            <AppNavigator />
            <Router />
          </>
        ) : (
          <LoadingText>Loading Data...</LoadingText>
        )}
        <GlobalStyle />
        <CodeMirrorStyle />
        <ExternalStyle />

        <Toast />
        <PreferencesModal />
        <ContextMenu />

        <Dialog />
        <Modal />
      </AppContainer>
    </ThemeProvider>
  )
}

export default App

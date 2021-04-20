import React, { useMemo, useRef } from 'react'
import styled from '../../../../../lib/v2/styled'
import FormInput from '../../../molecules/Form/atoms/FormInput'
import SidebarHeader from '../atoms/SidebarHeader'
import cc from 'classcat'
import { useEffectOnce, useSet } from 'react-use'
import SidebarSearchCategory from '../atoms/SidebarSearchCategory'
import SidebarSearchItem from '../atoms/SidebarSearchItem'
import SidebarContextList from '../atoms/SidebarContextList'
import Spinner from '../../../atoms/Spinner'
import { overflowEllipsis } from '../../../../../lib/v2/styled/styleFunctions'
import plur from 'plur'
import CloseButtonWrapper from '../../../molecules/CloseButtonWrapper'

interface SidebarSearchProps {
  searchQuery: string
  setSearchQuery: (val: string) => void
  className?: string
  sending?: boolean
  recentlyVisited?: SidebarSearchHistory[]
  recentlySearched?: string[]
  searchResults?: SidebarSearchResult[]
  searchState: SidebarSearchState
}

export type SidebarSearchState = { isNotDebouncing: boolean; fetching: boolean }

export type SidebarSearchResult = {
  label: string
  href: string
  contexts?: string[]
  onClick: () => void
  emoji?: string
  defaultIcon?: string
}

export type SidebarSearchHistory = {
  emoji?: string
  defaultIcon?: string
  label: string
  href: string
  onClick: () => void
}

const SidebarSearch = ({
  className,
  searchQuery,
  setSearchQuery,
  recentlySearched = [],
  recentlyVisited = [],
  searchState: { isNotDebouncing, fetching },
  searchResults = [],
}: SidebarSearchProps) => {
  const [, { has, add, remove, toggle }] = useSet<string>(new Set())
  const inputRef = useRef<HTMLInputElement>(null)

  useEffectOnce(() => {
    inputRef.current?.focus()
  })

  const results = useMemo(() => {
    return searchResults.reduce(
      (acc, val) => {
        const labelMatch = val.label
          .toLocaleLowerCase()
          .includes(searchQuery.toLocaleLowerCase())
        if (labelMatch && val.contexts == null) {
          acc.items.push(val)
        } else if (val.contexts != null) {
          acc.contextItems.push(val)
        } else {
          acc.similar.push(val)
        }
        return acc
      },
      {
        items: [],
        contextItems: [],
        similar: [],
      } as {
        items: SidebarSearchResult[]
        contextItems: SidebarSearchResult[]
        similar: SidebarSearchResult[]
      }
    )
  }, [searchResults, searchQuery])

  return (
    <Container className={cc(['sidebar__search', className])}>
      <SidebarHeader label='Search' />
      <SidebarContextList className='sidebar__search__wrapper'>
        <CloseButtonWrapper
          onClick={() => setSearchQuery('')}
          show={searchQuery !== ''}
          className='sidebar__search__input__wrapper'
        >
          <FormInput
            className='sidebar__search__input'
            placeholder='Search'
            id='sidebar__search__input'
            value={searchQuery}
            onChange={(ev) => setSearchQuery(ev.target.value)}
            ref={inputRef}
          />
        </CloseButtonWrapper>
        <div className='sidebar__search__results'>
          {searchQuery.trim() === '' && (
            <>
              {recentlyVisited.length > 0 && (
                <>
                  <SidebarSearchCategory
                    id='sidebar__search__history'
                    folded={has('history')}
                    unfold={() => remove('history')}
                    fold={() => add('history')}
                    toggle={() => toggle('history')}
                    className='sidebar__search__category'
                  >
                    Recently Visited
                  </SidebarSearchCategory>
                  {!has('history') &&
                    recentlyVisited.map((item, i) => (
                      <SidebarSearchItem
                        label={item.label}
                        labelHref={item.href}
                        labelClick={item.onClick}
                        defaultIcon={item.defaultIcon}
                        emoji={item.emoji}
                        key={`recently-visited-${i}`}
                        id={`recently-visited-${i}`}
                      />
                    ))}
                </>
              )}
              {recentlySearched.length > 0 && (
                <>
                  <SidebarSearchCategory
                    id='sidebar__search__keywords'
                    folded={has('keywords')}
                    unfold={() => remove('keywords')}
                    fold={() => add('keywords')}
                    toggle={() => toggle('keywords')}
                    className='sidebar__search__category'
                  >
                    Recent Keywords
                  </SidebarSearchCategory>
                  {!has('keywords') &&
                    recentlySearched.map((keyword) => (
                      <SidebarSearchItem
                        label={keyword}
                        labelClick={() => setSearchQuery(keyword)}
                        key={`recently-searched-${keyword}`}
                        id={`recently-searched-${keyword}`}
                      />
                    ))}
                </>
              )}
            </>
          )}

          {searchQuery.trim() !== '' && (fetching || !isNotDebouncing) && (
            <>
              {fetching ? (
                <Spinner
                  style={{
                    position: 'absolute',
                    right: 0,
                    left: 0,
                    margin: 'auto',
                    bottom: 0,
                    top: 0,
                  }}
                />
              ) : (
                <div className='sidebar__search__empty'>..</div>
              )}
            </>
          )}

          {searchQuery.trim() !== '' &&
            searchResults.length === 0 &&
            !fetching &&
            isNotDebouncing && (
              <>
                <strong className='sidebar__search__empty'>No results</strong>
                <div className='sidebar__search__empty'>
                  Try a different query.
                </div>
              </>
            )}

          {searchQuery.trim() !== '' &&
            searchResults.length > 0 &&
            !fetching &&
            isNotDebouncing && (
              <>
                {results.items.length + results.contextItems.length === 0 ? (
                  <>
                    <strong className='sidebar__search__empty'>
                      No matches
                    </strong>
                    <div className='sidebar__search__empty'>
                      Try a different query.
                    </div>
                  </>
                ) : (
                  <>
                    {results.items.length === 0 ? null : (
                      <>
                        <SidebarSearchCategory
                          id='sidebar__search__matches'
                          folded={has('matches')}
                          unfold={() => remove('matches')}
                          fold={() => add('matches')}
                          toggle={() => toggle('matches')}
                          className='sidebar__search__category'
                        >
                          {results.items.length}{' '}
                          {plur('item', results.items.length)}
                        </SidebarSearchCategory>
                        {!has('matches') &&
                          results.items.map((result, i) => (
                            <SidebarSearchItem
                              id={`sidebar__result--matches__${i}`}
                              key={`sidebar__result--matches__${i}`}
                              label={result.label}
                              labelHref={result.href}
                              labelClick={result.onClick}
                              emoji={result.emoji}
                              defaultIcon={result.defaultIcon}
                              highlighted={searchQuery}
                            />
                          ))}
                      </>
                    )}

                    {results.contextItems.length === 0 ? null : (
                      <>
                        <SidebarSearchCategory
                          id='sidebar__search__context__matches'
                          folded={has('context__matches')}
                          unfold={() => remove('context__matches')}
                          fold={() => add('context__matches')}
                          toggle={() => toggle('context__matches')}
                          className='sidebar__search__category'
                        >
                          Found in {results.contextItems.length}{' '}
                          {plur('item', results.contextItems.length)}
                        </SidebarSearchCategory>
                        {!has('context__matches') &&
                          results.contextItems.map((result, i) => (
                            <SidebarSearchItem
                              id={`sidebar__result__${i}`}
                              key={`sidebar__result__${i}`}
                              label={result.label}
                              labelHref={result.href}
                              labelClick={result.onClick}
                              contexts={result.contexts}
                              emoji={result.emoji}
                              defaultIcon={result.defaultIcon}
                              highlighted={searchQuery}
                              folded={
                                result.contexts != null
                                  ? has(`${result.label}-${i}`)
                                  : undefined
                              }
                              folding={
                                result.contexts != null
                                  ? {
                                      unfold: () =>
                                        remove(`${result.label}-${i}`),
                                      fold: () => add(`${result.label}-${i}`),
                                      toggle: () =>
                                        toggle(`${result.label}-${i}`),
                                    }
                                  : undefined
                              }
                            />
                          ))}
                      </>
                    )}
                  </>
                )}

                {results.similar.length === 0 ? null : (
                  <>
                    <div className='sidebar__search__delimiter' />
                    <SidebarSearchCategory
                      id='sidebar__search__similarities'
                      folded={has('similarities')}
                      unfold={() => remove('similarities')}
                      fold={() => add('similarities')}
                      toggle={() => toggle('similarities')}
                      className='sidebar__search__category'
                    >
                      {results.similar.length} Similar{' '}
                      {plur('result', results.similar.length)}
                    </SidebarSearchCategory>
                    {!has('similarities') &&
                      results.similar.map((result, i) => (
                        <SidebarSearchItem
                          id={`sidebar__result--similar__${i}`}
                          key={`sidebar__result--similar__${i}`}
                          label={result.label}
                          labelHref={result.href}
                          labelClick={result.onClick}
                          emoji={result.emoji}
                          defaultIcon={result.defaultIcon}
                          highlighted={searchQuery}
                        />
                      ))}
                  </>
                )}
              </>
            )}
        </div>
      </SidebarContextList>
    </Container>
  )
}

const Container = styled.div`
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .sidebar__search__input__wrapper {
    margin: 0px ${({ theme }) => theme.sizes.spaces.df}px;
    flex: 0 0 auto;
  }

  .sidebar__search__delimiter {
    margin: ${({ theme }) => theme.sizes.spaces.df}px auto;
    height: 1px;
    width: 90%;
    background: ${({ theme }) => theme.colors.border.main};
  }

  .sidebar__search__results {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    overflow: auto;
    flex: 1 1 auto;
    padding: ${({ theme }) => theme.sizes.spaces.df}px 0;
  }

  .sidebar__search__empty {
    margin: 0px ${({ theme }) => theme.sizes.spaces.df}px;
    font-size: ${({ theme }) => theme.sizes.fonts.df}px;
    color: ${({ theme }) => theme.colors.text.subtle};
  }

  .sidebar__search__wrapper {
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .sidebar__search__category {
    justify-content: flex-start;
    margin: 0px ${({ theme }) => theme.sizes.spaces.df}px;
    font-size: ${({ theme }) => theme.sizes.fonts.df}px;
    white-space: nowrap;
    text-align: left;

    .button__label {
      ${overflowEllipsis}
    }
  }

  .sidebar__search__empty + .sidebar__search__category,
  .sidebar__search__item + .sidebar__search__category {
    margin-top: ${({ theme }) => theme.sizes.spaces.df}px;
  }

  .sidebar__search__item {
    margin: 0 !important;
  }
`

export default SidebarSearch
import {Fragment, h} from 'preact'
import {useActions, useSelector} from '../../../helpers/connect'
import actions from '../../../actions'

import {getErrorMessage} from '../../../errors'
import printAda from '../../../helpers/printAda'

import Conversions from '../../common/conversions'
import SearchableSelect from '../../common/searchableSelect'

import AccountDropdown from '../accounts/accountDropdown'
import {getSourceAccountInfo} from '../../../state'
import {useCallback, useMemo, useRef} from 'preact/hooks'
import {
  AssetFamily,
  Lovelace,
  SendTransactionSummary,
  Token,
  TransactionSummary,
  TxType,
} from '../../../types'
import {AdaIcon} from '../../common/svg'
import {parseCoins} from '../../../../frontend/helpers/validators'
import {
  assetNameHex2Readable,
  encodeAssetFingerprint,
} from '../../../../frontend/wallet/shelley/helpers/addresses'
import tooltip from '../../common/tooltip'
import {FormattedAssetItem} from '../../common/asset'
import {shouldDisableSendingButton} from '../../../helpers/common'

const CalculatingFee = () => <div className="validation-message send">Calculating fee...</div>

const SendFormErrorMessage = ({sendFormValidationError}) => (
  <span>{getErrorMessage(sendFormValidationError.code, sendFormValidationError.params)}</span>
)

const SendValidation = ({sendFormValidationError, txSuccessTab}) =>
  txSuccessTab === 'send' && !sendFormValidationError ? (
    <div className="validation-message transaction-success">Transaction successful!</div>
  ) : (
    sendFormValidationError && (
      <div className="validation-message send error">
        <SendFormErrorMessage sendFormValidationError={sendFormValidationError} />
      </div>
    )
  )

type DropdownAssetItem = Token & {
  fingerprint: string
  assetNameHex: string
  type: AssetFamily
}

const displayDropdownAssetItem = (props: DropdownAssetItem) => (
  <FormattedAssetItem key={props.assetName} {...props}>
    {({icon, formattedAssetName, formattedAssetLink, formattedAmount}) => {
      return (
        <div
          className="multi-asset-item"
          data-cy={
            props.type === AssetFamily.TOKEN
              ? 'SendAssetDropdownTokenItem'
              : 'SendAssetDropdownADAitem'
          }
        >
          <div className="multi-asset-name-amount">
            <div className="multi-asset-name">
              {icon}
              {formattedAssetName}
              {formattedAssetLink}
            </div>
            <div
              className="multi-asset-amount"
              data-cy={
                props.type === AssetFamily.TOKEN ? 'SendAssetTokenQuantity' : 'SendAssetADAquantity'
              }
            >
              {formattedAmount}
            </div>
          </div>
        </div>
      )
    }}
  </FormattedAssetItem>
)

interface Props {
  isModal: boolean
  title: string
}

const SendAdaPage = ({
  isModal, // TODO: remove
  title,
}: Props) => {
  const {
    sourceAccountIndex,
    sendAddress,
    balance,
    conversionRates,
    feeRecalculating,
    sendAddressValidationError,
    sendAmount,
    sendAmountValidationError,
    targetAccountIndex,
    tokenBalance,
    transactionFee,
    txSuccessTab,
    summary,
    walletOperationStatusType,
  } = useSelector((state) => ({
    sendAddressValidationError: state.sendAddressValidationError,
    sendAddress: state.sendAddress.fieldValue,
    sendAmountValidationError: state.sendAmountValidationError,
    sendAmount: state.sendAmount,
    feeRecalculating: state.calculatingFee,
    conversionRates: state.conversionRates && state.conversionRates.data,
    sendTransactionSummary: state.sendTransactionSummary,
    transactionFee: state.transactionFee,
    txSuccessTab: state.txSuccessTab,
    balance: getSourceAccountInfo(state).balance,
    sourceAccountIndex: state.sourceAccountIndex,
    targetAccountIndex: state.targetAccountIndex,
    tokenBalance: getSourceAccountInfo(state).tokenBalance,
    summary: state.sendTransactionSummary as TransactionSummary & SendTransactionSummary,
    walletOperationStatusType: state.walletOperationStatusType,
  }))
  const {
    updateAddress,
    updateAmount,
    confirmTransactionOld,
    sendMaxFunds,
    setSourceAccount,
    setTargetAccount,
    switchSourceAndTargetAccounts,
  } = useActions(actions)

  const amountField = useRef<HTMLInputElement>(null)
  const submitTxBtn = useRef<HTMLButtonElement>(null)
  const sendCardDiv = useRef<HTMLDivElement>(null)

  const sendFormValidationError = sendAddressValidationError || sendAmountValidationError

  const enableSubmit = sendAmount.fieldValue && sendAddress && !sendFormValidationError
  const isSendAddressValid = !sendAddressValidationError && sendAddress !== ''

  const totalLovelace =
    ((summary.coins + summary.fee + summary.minimalLovelaceAmount) as Lovelace) || (0 as Lovelace)
  const totalTokens = summary.token

  const adaAsset: DropdownAssetItem = {
    type: AssetFamily.ADA,
    policyId: null,
    assetName: 'ADA',
    assetNameHex: null,
    fingerprint: null,
    quantity: balance,
  }

  const dropdownAssetItems: Array<DropdownAssetItem> = useMemo(
    () => [
      adaAsset,
      ...tokenBalance
        .sort((a: Token, b: Token) => b.quantity - a.quantity)
        .map(
          (token: Token): DropdownAssetItem => ({
            ...token,
            assetNameHex: token.assetName,
            assetName: assetNameHex2Readable(token.assetName),
            fingerprint: encodeAssetFingerprint(token.policyId, token.assetName),
            type: AssetFamily.TOKEN,
          })
        ),
    ],
    [adaAsset, tokenBalance]
  )

  const selectedAsset = useMemo(() => {
    if (sendAmount.assetFamily === AssetFamily.ADA) {
      return adaAsset
    }
    return dropdownAssetItems.find(
      (item) =>
        item.assetNameHex === sendAmount.token.assetName &&
        item.policyId === sendAmount.token.policyId
    )
  }, [adaAsset, dropdownAssetItems, sendAmount])

  const submitHandler = async () => {
    await confirmTransactionOld(TxType.SEND_ADA)
  }

  const searchPredicate = useCallback(
    (query: string, {policyId, assetName, fingerprint}: DropdownAssetItem): boolean =>
      (fingerprint && fingerprint.toLowerCase().includes(query.toLowerCase())) ||
      assetName.toLowerCase().includes(query.toLowerCase()) ||
      (policyId && policyId.toLowerCase().includes(query.toLowerCase())),
    []
  )

  const updateSentAssetPair = useCallback(
    (dropdownAssetItem: DropdownAssetItem, fieldValue: string) => {
      if (dropdownAssetItem.type === AssetFamily.ADA) {
        updateAmount({
          assetFamily: AssetFamily.ADA,
          fieldValue,
          coins: parseCoins(fieldValue) || (0 as Lovelace),
        })
      } else if (dropdownAssetItem.type === AssetFamily.TOKEN) {
        updateAmount({
          assetFamily: AssetFamily.TOKEN,
          fieldValue,
          token: {
            policyId: dropdownAssetItem.policyId,
            assetName: dropdownAssetItem.assetNameHex,
            quantity: parseFloat(fieldValue),
          },
        })
      }
    },
    [updateAmount]
  )

  const displayDropdownSelectedItem = (dropdownAssetItem: DropdownAssetItem) => {
    const {assetName, policyId, type} = dropdownAssetItem
    return (
      <div className="wrapper">
        <FormattedAssetItem {...dropdownAssetItem}>
          {({icon}) => {
            return (
              <Fragment>
                {icon}
                {assetName}
                {type === AssetFamily.TOKEN && (
                  <div className="hash">
                    (<div className="ellipsis">{policyId}</div>)
                  </div>
                )}
              </Fragment>
            )
          }}
        </FormattedAssetItem>
      </div>
    )
  }

  const handleDropdownOnSelect = useCallback(
    (dropdownAssetItem: DropdownAssetItem): void => {
      updateSentAssetPair(dropdownAssetItem, sendAmount.fieldValue)
    },
    [sendAmount.fieldValue, updateSentAssetPair]
  )

  const handleAmountOnInput = useCallback(
    (e) => {
      updateSentAssetPair(selectedAsset, e?.target?.value)
    },
    [selectedAsset, updateSentAssetPair]
  )

  const addressInput = (
    <input
      type="text"
      id="send-address"
      className={`input ${isModal ? '' : 'send-address'} fullwidth`}
      name="send-address"
      placeholder="Receiving address"
      data-cy="AddressTextField"
      value={sendAddress}
      onInput={updateAddress}
      autoComplete="off"
      onKeyDown={(e) => e.key === 'Enter' && amountField?.current.focus()}
      disabled={isModal || shouldDisableSendingButton(walletOperationStatusType)}
    />
  )

  const accountSwitch = (
    <div className="send-values dropdowns" data-cy="AccountSwitch">
      <label className="account-label">From</label>
      <AccountDropdown accountIndex={sourceAccountIndex} setAccountFunc={setSourceAccount} />
      <button className="button account-switch" onClick={switchSourceAndTargetAccounts}>
        Switch
      </button>
      <div />
      <label className="account-label">To</label>
      <AccountDropdown accountIndex={targetAccountIndex} setAccountFunc={setTargetAccount} />
    </div>
  )

  // TODO: is this possible to do in raw CSS?
  // dropdown width is dependand on div that is much higher in HTML DOM
  const calculateDropdownWidth = () => {
    const deriveFrom = sendCardDiv?.current
    if (deriveFrom) {
      const style = window.getComputedStyle(deriveFrom)
      const width = deriveFrom.clientWidth
      const paddingLeft = parseInt(style.paddingLeft, 10)
      const paddingRight = parseInt(style.paddingRight, 10)
      return `${width - paddingLeft - paddingRight}px`
    }
    return '100%'
  }

  const selectAssetDropdown = (
    <Fragment>
      <label className="send-label">Asset</label>
      <SearchableSelect
        wrapperClassName="no-margin"
        defaultItem={selectedAsset}
        displaySelectedItem={displayDropdownSelectedItem}
        displaySelectedItemClassName="input dropdown"
        items={dropdownAssetItems}
        displayItem={displayDropdownAssetItem}
        onSelect={handleDropdownOnSelect}
        showSearch={dropdownAssetItems.length >= 4}
        searchPredicate={searchPredicate}
        searchPlaceholder={`Search from ${dropdownAssetItems.length} assets by name or policy ID`}
        dropdownClassName="modal-dropdown"
        getDropdownWidth={calculateDropdownWidth}
        disabled={shouldDisableSendingButton(walletOperationStatusType)}
      />
    </Fragment>
  )

  const amountInput = (
    <Fragment>
      <label
        className={`ada-label amount ${selectedAsset.type === AssetFamily.TOKEN ? 'token' : ''}`}
        htmlFor={`${isModal ? 'account' : ''}send-amount`}
      >
        Amount
      </label>
      <div className="input-wrapper">
        <input
          className="input send-amount"
          id={`${isModal ? 'account' : ''}send-amount`}
          name={`${isModal ? 'account' : ''}send-amount`}
          data-cy={`${isModal ? 'Account' : ''}SendAmountField`}
          placeholder={selectedAsset.type === AssetFamily.ADA ? '0.000000' : '0'}
          value={sendAmount.fieldValue}
          onInput={handleAmountOnInput}
          autoComplete="off"
          ref={amountField}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && submitTxBtn) {
              // eslint-disable-next-line no-unused-expressions
              submitTxBtn?.current.click()
              e.preventDefault()
            }
          }}
          disabled={shouldDisableSendingButton(walletOperationStatusType)}
        />
        <button
          className="button send-max"
          onClick={sendMaxFunds}
          disabled={!isSendAddressValid || !balance}
        >
          Max
        </button>
      </div>
    </Fragment>
  )

  return (
    <div className="send card" ref={sendCardDiv}>
      <h2 className={`card-title ${isModal ? 'show' : ''}`}>{title}</h2>
      {isModal ? accountSwitch : addressInput}
      <div className="send-values">
        {selectAssetDropdown}
        {amountInput}
        <div className="ada-label">Fee</div>
        <div className="send-fee" data-cy="SendFeeAmount">
          {printAda(transactionFee)}
        </div>
        {selectedAsset.type === AssetFamily.TOKEN && (
          <Fragment>
            <div className="send-label">
              Min ADA
              <a
                {...tooltip(
                  'Every transaction output with tokens must include a minimum amount of ADA, based on the number of different tokens in the transaction output.',
                  true
                )}
              >
                <span className="show-info">{''}</span>
              </a>
            </div>
            {/* TODO: Connect to state when this values is calculated */}
            <div className="send-fee" data-cy="SendAssetMinAdaAmount">
              {printAda(summary.minimalLovelaceAmount)}
            </div>
          </Fragment>
        )}
      </div>
      <div className="send-total">
        <div className="send-total-title">Total</div>
        <div className="send-total-inner">
          {selectedAsset.type === AssetFamily.ADA ? (
            <div className="send-total-ada">
              {printAda(totalLovelace)}
              <AdaIcon />
            </div>
          ) : (
            <div className="send-total-ada">
              {totalTokens?.quantity != null ? totalTokens.quantity : 0}{' '}
              {totalTokens ? assetNameHex2Readable(totalTokens.assetName) : selectedAsset.assetName}
            </div>
          )}
          {selectedAsset.type === AssetFamily.ADA
            ? conversionRates && (
              <Conversions balance={totalLovelace} conversionRates={conversionRates} />
            )
            : ''}
        </div>
        <div />
        {selectedAsset.type === AssetFamily.TOKEN && (
          <div className="send-total-inner ma-ada-fees">
            <div>
              +{printAda(totalLovelace)}
              <AdaIcon />
            </div>
            {conversionRates && (
              <Conversions balance={totalLovelace} conversionRates={conversionRates} />
            )}
          </div>
        )}
      </div>
      <div className="validation-row">
        <button
          {...tooltip(
            'Cannot send funds while transaction is pending or reloading',
            shouldDisableSendingButton(walletOperationStatusType)
          )}
          className="button primary medium"
          disabled={
            !enableSubmit ||
            feeRecalculating ||
            shouldDisableSendingButton(walletOperationStatusType)
          }
          onClick={submitHandler}
          ref={submitTxBtn}
          data-cy="SendButton"
        >
          Send
        </button>
        {feeRecalculating ? (
          <CalculatingFee />
        ) : (
          <SendValidation
            sendFormValidationError={sendFormValidationError}
            txSuccessTab={txSuccessTab}
          />
        )}
      </div>
    </div>
  )
}

SendAdaPage.defaultProps = {
  isModal: false,
  title: 'Send',
}

export default SendAdaPage

;(async () => {
  const assert = require('assert')
  const cbor = require('cbor')

  const {CardanoWallet, txFeeFunction} = require('../../wallet/cardano-wallet')
  const mockNetwork = require('../mock')

  describe('transaction fee function', () => {
    it('should properly compute transaction fee based on transaction size parameter', () => {
      assert.equal(txFeeFunction(50), 157579)
      assert.equal(txFeeFunction(351), 170807)
    })
  })

  const testSeed = 39

  const mockConfig1 = {
    CARDANOLITE_BLOCKCHAIN_EXPLORER_URL: 'https://explorer.cardanolite.com',
    CARDANOLITE_TRANSACTION_SUBMITTER_URL: 'http://localhost:3000/api/transactions',
    CARDANOLITE_BLOCKCHAIN_EXPLORER_PROXY_TARGET: 'https://explorer.cardanolite.com',
    CARDANOLITE_WALLET_ADDRESS_LIMIT: 5,
  }

  const mockConfig2 = {
    CARDANOLITE_BLOCKCHAIN_EXPLORER_URL: 'https://explorer.cardanolite.com',
    CARDANOLITE_TRANSACTION_SUBMITTER_URL: 'http://localhost:3000/api/transactions',
    CARDANOLITE_BLOCKCHAIN_EXPLORER_PROXY_TARGET: 'https://explorer.cardanolite.com',
    CARDANOLITE_WALLET_ADDRESS_LIMIT: 15,
  }

  const unusedWallet = await CardanoWallet({
    cryptoProvider: 'mnemonic',
    mnemonicOrHdNodeString:
      'rain flame hip basic extend capable chair oppose gorilla fun aunt emotion',
    config: mockConfig1,
    randomSeed: testSeed,
  })
  const wallet = await CardanoWallet({
    cryptoProvider: 'mnemonic',
    mnemonicOrHdNodeString:
      'logic easily waste eager injury oval sentence wine bomb embrace gossip supreme',
    config: mockConfig2,
    randomSeed: testSeed,
  })

  const myAddress =
    'DdzFFzCqrhsgPcpYL9aevEtfvP4bTFHde8kjT3acCkbK9SvfC9iikDPRtfRP8Sq6fsusNfRfm7sjhJfo7LDPT3c4rDr8PqkdHfW8PfuY'

  // eslint-disable-next-line prefer-arrow-callback
  describe('wallet balance computation', function() {
    this.timeout(10000)

    it('should properly fetch empty wallet balance', async () => {
      const mockNet = mockNetwork(mockConfig1)
      mockNet.mockBlockChainExplorer()

      assert.equal(await unusedWallet.getBalance(), 0)
    })

    it('should properly fetch nonempty wallet balance', async () => {
      const mockNet = mockNetwork(mockConfig2)
      mockNet.mockBlockChainExplorer()

      assert.equal(await wallet.getBalance(), 2967795)
    })
  })

  // eslint-disable-next-line prefer-arrow-callback
  describe('wallet change address computation', function() {
    this.timeout(10000)

    it('should properly compute change address for unused wallet', async () => {
      const mockNet = mockNetwork(mockConfig1)
      mockNet.mockBlockChainExplorer()

      assert.equal(
        await unusedWallet.getChangeAddress(),
        'DdzFFzCqrhssmYoG5Eca1bKZFdGS8d6iag1mU4wbLeYcSPVvBNF2wRG8yhjzQqErbg63N6KJA4DHqha113tjKDpGEwS5x1dT2KfLSbSJ'
      )
    })

    it('should properly compute change address', async () => {
      const mockNet = mockNetwork(mockConfig2)
      mockNet.mockBlockChainExplorer()

      assert.equal(
        await wallet.getChangeAddress(5),
        'DdzFFzCqrht2BjaxbFgHEYYHmHNotTdp6p727yGnMccSovXj2ZmR83Q4hYXkong6L7D8aB5Y2fRTZ1zgLJzSzFght3J799UTbeTBJk4E'
      )
    })
  })

  describe('address ownership verification', () => {
    const ownAddress =
      'DdzFFzCqrht2BjaxbFgHEYYHmHNotTdp6p727yGnMccSovXj2ZmR83Q4hYXkong6L7D8aB5Y2fRTZ1zgLJzSzFght3J799UTbeTBJk4E'

    it('should accept own address', async () => {
      assert.equal(await wallet.isOwnAddress(ownAddress), true)
    })

    const foreignAddress =
      'DdzFFzCqrhsgPcpYL9aevEtfvP4bTFHde8kjT3acCkbK9SvfC9iikDPRtfRP8Sq6fsusNfRfm7sjhJfo7LDPT3c4rDr8PqkdH448P44Y'
    it('should reject foreign address', async () => {
      assert.equal(await wallet.isOwnAddress(foreignAddress), false)
    })
  })

  // eslint-disable-next-line prefer-arrow-callback
  describe('successful transaction fee computation', function() {
    this.timeout(10000)

    it('should compute the right transaction fee for given transaction', async () => {
      const mockNet = mockNetwork(mockConfig2)
      mockNet.mockBlockChainExplorer()
      mockNet.mockUtxoEndpoint()

      assert.equal(await wallet.getTxFee(myAddress, 47), 178893)
    })
  })

  // eslint-disable-next-line prefer-arrow-callback
  describe('transaction serialization', function() {
    it('should properly serialize transaction before signing', async () => {
      const mockNet = mockNetwork(mockConfig2)
      mockNet.mockBlockChainExplorer()
      mockNet.mockUtxoEndpoint()

      const txAux = await wallet._prepareTxAux(myAddress, 47)

      // transaction serialization before providing witnesses
      const txAuxSerialized = cbor.encode(txAux).toString('hex')

      const expectedtxAuxSerialized =
        '839f8200d81858248258206ca5fde47f4ff7f256a7464dbf0cb9b4fb6bce9049eee1067eed65cf5d6e2765008200d81858248258206ca5fde47f4ff7f256a7464dbf0cb9b4fb6bce9049eee1067eed65cf5d6e276501ff9f8282d818584283581c13f3997560a5b81f5ac680b3322a2339433424e4e589ab3d752afdb6a101581e581c2eab4601bfe583febc23a04fb0abc21557adb47cea49c68d7b2f40a5001ac63884bf182f8282d818584283581cab41e66f954dd7f1c16081755eb02ee61dc720bd9e05790f9de649b7a101581e581c140539c64edded60a7f2d169cb4da86a47bccc6a92e4130754fd0f36001a306ccb8f1a002a8df7ffa0'

      assert.equal(txAuxSerialized, expectedtxAuxSerialized)
    })

    // transaction hash computation
    it('should properly compute transaction hash', async () => {
      const mockNet = mockNetwork(mockConfig2)
      mockNet.mockBlockChainExplorer()
      mockNet.mockUtxoEndpoint()

      const txAux = await wallet._prepareTxAux(myAddress, 47)
      const expectedTxHash = '1ca536020cb1a7a028ab27d5a2173335b039418bd03013c70641a09b14440fd9'

      assert.equal(txAux.getId(), expectedTxHash)
    })

    // whole transaction serialization
    it('should properly serialize the whole transaction', async () => {
      const mockNet = mockNetwork(mockConfig2)
      mockNet.mockBlockChainExplorer()
      mockNet.mockUtxoEndpoint()

      const tx = await wallet.prepareTx(myAddress, 47)

      const expectedTxBody =
        '82839f8200d81858248258206ca5fde47f4ff7f256a7464dbf0cb9b4fb6bce9049eee1067eed65cf5d6e2765008200d81858248258206ca5fde47f4ff7f256a7464dbf0cb9b4fb6bce9049eee1067eed65cf5d6e276501ff9f8282d818584283581c13f3997560a5b81f5ac680b3322a2339433424e4e589ab3d752afdb6a101581e581c2eab4601bfe583febc23a04fb0abc21557adb47cea49c68d7b2f40a5001ac63884bf182f8282d818584283581cab41e66f954dd7f1c16081755eb02ee61dc720bd9e05790f9de649b7a101581e581c140539c64edded60a7f2d169cb4da86a47bccc6a92e4130754fd0f36001a306ccb8f1a002a8df7ffa0828200d81858858258406830165e81b0666850f36a4583f7a8a29b09e120f99852c56d37ded39bed1bb0464a98c35cf0f6458be6351d8f8527fb8b17fe6be0523e901d9562c2b7a52a9e58400558d0ce068d794a2fa64dfa9f3f3e378d585915d7e407d06f9e8c92fb1a2774c97129f2d8a2cd6c125c04d5d5b9a9aedbd680cfd15c312033f2afd07909f00b8200d81858858258400093f68540416f4deea889da21af1f1760edc3478bcac204a3013a046327c29c1748af9d186a7e463caa63ef2c660e5f2a051ad014a050d1b27e636128e1947e584032611014983bebd3018bf17810d6d6a4d363a6933947b83a0c5b0528db001167701137f8a0924d06b256f8ff3c220b958832c7b98706d8b03635541c077c7c0a'

      assert.equal(tx.txBody, expectedTxBody)
    })
  })

  // eslint-disable-next-line prefer-arrow-callback
  describe('test transaction submission', function() {
    this.timeout(10000)

    it('should properly submit transaction', async () => {
      const mockNet = mockNetwork(mockConfig2)
      mockNet.mockBlockChainExplorer()
      mockNet.mockUtxoEndpoint()
      mockNet.mockTransactionSubmitter()

      const result = await wallet.sendAda(myAddress, 47)
      assert.equal(result, true)
    })
  })
})()

const Blockchain = require('../blockchain/blockchain');
const uuid = require('uuid/v1');
const rp = require('request-promise');
var User = require('../db/User');
const sha256 = require('sha256');
const chain = new Blockchain();
var express = require('express');
var router = express.Router();
var SimpleCrypto = require("simple-crypto-js").default;

var loggedin = function (req, res, next) {
    if (req.isAuthenticated()) {
      next()
    } else {
      res.redirect('/login')
    }
};

router.get('/verify',loggedin,function(req,res) {

    var chainCopy = chain;
    var revChain = chainCopy.chain.reverse();
    
    revChain.forEach(function(block) {

        if(block.transactions.length>0) {
            block.transactions.forEach(function(trans) {
 
                const id = trans.data.id;
                if(id.toString()==req.user.id.toString()) {

                    const user = req.user;
                    User.findById(id,function(err,doc) {
                        if(err) {
                            return res.send(500, { error: err });
                          }

                          var simpleCrypto = new SimpleCrypto(doc.secretkey);
      
                          const cipherText = trans.data.encryptedData;
      
                          var decipherText = simpleCrypto.decrypt(cipherText);
      
                          console.log('text ',decipherText);

                          
      
                          return   res.send('verified');
                    });
                }
            });
        }
    });

}); 

router.get('/add',loggedin, function(req,res) {

    const id = req.user.id;
    User.findById(id,function(err,doc) {

        if(err) {
            return res.send(500, { error: err });
          }

        var simpleCrypto = new SimpleCrypto(doc.secretkey);     

        const data = JSON.stringify(doc);
        const hash = sha256(data);
        const encryptedData = simpleCrypto.encrypt(data);   
        var obj = {
            id,
            hash,
            encryptedData,      
            timestamp:Date.now()
        };


    
        var options = {
            uri: chain.currentNodeUrl+'/consensus',
            method:'GET',
            json:true
        };
    
        rp(options)
            .then(function (data) {
                
                    const requestOptions = {
                        uri:chain.currentNodeUrl+'/transaction/broadcast',
                        method:'POST',
                        body:{
                            data:obj
                        },
                        json:true
                    }
    
                    rp(requestOptions)
                    .then(function(data) {



                        res.render("blockchain",{chain});
                    });
    
                
            })
            .catch(function (err) {
                res.json({
                    note:'something went wrong.'
                });
            });

    });

});

router.get('/blockchain',function(req,res) {

    var options = {
        uri: chain.currentNodeUrl+'/consensus',
        method:'GET',
        json:true
    };

    rp(options)
        .then(function (data) {
            
            res.send(chain);
            
        })
        .catch(function (err) {
            res.json({
                note:'something went wrong.'
            });
        });

  
    // res.render('blockchain',{
    //     chain:chain
    // });
});

//API

router.post('/transaction',function(req,res) {
    const newTransaction = req.body;
    const blockIndex = chain.addTransactionToPendingTransactions(newTransaction);
    res.json({
        note:`Transaction will be added in block ${blockIndex}.`
    });
});

router.post('/transaction/broadcast',function(req,res) {
    const newTransaction = chain.createNewTransaction(req.body.data);
    chain.addTransactionToPendingTransactions(newTransaction);
    const requestPromises = [];
    chain.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri:networkNodeUrl+'/transaction',
            method:'POST',
            body:newTransaction,
            json:true
        }
        requestPromises.push(rp(requestOptions));
    });

    Promise.all(requestPromises) 
    .then(data => {
        res.json({
            note:'Transaction created and broadcast successfully.'
        });
    })
    .catch(err=> {
        console.log("An error has occured "+err);
    });

});

router.get('/mine', function(req, res) {
	const lastBlock = chain.getLastBlock();
	const previousBlockHash = lastBlock['hash'];
	const currentBlockData = {
		transactions: chain.pendingTransactions,
		index: lastBlock['index'] + 1
	};
	const nonce = chain.proofOfWork(previousBlockHash, currentBlockData);
	const blockHash = chain.hashBlock(previousBlockHash, currentBlockData, nonce);
	const newBlock = chain.createNewBlock(nonce, previousBlockHash, blockHash);

	const requestPromises = [];
	chain.networkNodes.forEach(networkNodeUrl => {
		const requestOptions = {
			uri: networkNodeUrl + '/receive-new-block',
			method: 'POST',
			body: { newBlock: newBlock },
			json: true
		};

		requestPromises.push(rp(requestOptions));
	});

	Promise.all(requestPromises)
	.then(data => {
        res.render("blockchain",{chain: chain});
    })
    .catch(err=> {
        console.log("An error has occured "+err);
    });
});

router.post('/receive-new-block', function(req, res) {
	const newBlock = req.body.newBlock;
	const lastBlock = chain.getLastBlock();
	const correctHash = lastBlock.hash === newBlock.previousBlockHash; 
	const correctIndex = lastBlock['index'] + 1 === newBlock['index'];

	if (correctHash && correctIndex) {
		chain.chain.push(newBlock);
		chain.pendingTransactions = [];
		res.json({
			note: 'New block received and accepted.',
			newBlock: newBlock
		});
	} else {
		res.json({
			note: 'New block rejected.',
			newBlock: newBlock
		});
	}
});

router.post('/register-and-broadcast-node',function(req,res) {
    const newNodeUrl = req.body.newNodeUrl;
    if(chain.networkNodes.indexOf(newNodeUrl)==-1) {
        chain.networkNodes.push(newNodeUrl);
    }

    const regNodesPromises = [];
    chain.networkNodes.forEach(networkNodesUrl => {

        const requestOptions = {
            uri:networkNodesUrl+'/register-node',
            method:'POST',
            body:{newNodeUrl:newNodeUrl},
            json:true
        };

        regNodesPromises.push(rp(requestOptions));

    });

    Promise.all(regNodesPromises)
        .then(data=>{
            const bulkRegisterOptions = {
                uri:newNodeUrl + '/register-nodes-bulk', 
                method:'POST',
                body:{
                    allNetworkNodes:[
                        ...chain.networkNodes,
                        chain.currentNodeUrl
                    ]
                },
                json:true
            };
            return rp(bulkRegisterOptions);
        })
        .then(data => {
            res.render("blockchain",{pChain: chain});
        })
        .catch(err=> {
            console.log("An error has occured "+err);
        });
});

router.post('/register-node',function(req,res )  {

    const newNodeUrl = req.body.newNodeUrl;
    const nodeNotAlreadyPresent = chain.networkNodes.indexOf(newNodeUrl)==-1;
    const notCurrentNode = chain.currentNodeUrl!==newNodeUrl;

    if(nodeNotAlreadyPresent && notCurrentNode) chain.networkNodes.push(newNodeUrl);

    res.json({
        note:'New node registered successfully with node.'
    });

});

router.post('/register-nodes-bulk',function(req,res) {
    const allNetworkNodes = req.body.allNetworkNodes;
    allNetworkNodes.forEach(networkNodeUrl => {
        const nodeNotAlreadyPresent = chain.networkNodes.indexOf(networkNodeUrl) == -1;
        const notCurrentNode = chain.currentNodeUrl!==networkNodeUrl;
        if(nodeNotAlreadyPresent && notCurrentNode) {
            chain.networkNodes.push(networkNodeUrl);
        }
    });

    res.json({
        note:'Bulk registration successful'
    });

});


router.get('/consensus',function(req,res) {

    const requestPromises = [];
    chain.networkNodes.forEach(networkNodeUrl => {

        const requestOptions = {
            uri:networkNodeUrl+'/blockchain',
            method:'GET',
            json:true
        };

        requestPromises.push(rp(requestOptions));

    });

    Promise.all(requestPromises)
    .then(blockchains => {

        const currentChainLength = chain.chain.length;
        let maxChainLength = currentChainLength;
        let newLongestChain = null;
        let newPendingTransactions = null;

        blockchains.forEach(blockchain => {

            if(blockchain.chain.length > maxChainLength){
                maxChainLength = blockchain.chain.length;
                newLongestChain = blockchain.chain;
                newPendingTransactions = blockchain.pendingTransactions;
            };

        });

        if(!newLongestChain || (newLongestChain && !chain.chainIsValid(newLongestChain))) {
            res.render("blockchain",{chain: chain});
        } else{
            chain.chain = newLongestChain;
            chain.pendingTransactions = newPendingTransactions;
            res.render("blockchain",{chain: chain});
        }
    })
    .catch(err=> {
        console.log("An error has occured "+err);
    });;

});


//TO GET THE PARTICULAR BLOCK
router.get('/block/:blockHash',function(req,res) {
    const blockHash = req.params.blockHash;
    const correctBlock = chain.getBlock(blockHash);
    res.json({
        block:correctBlock
    });
});

//TO GET THE PARTICULAR TRANSACTION
router.get('/transaction/:transactionId',function(req,res) {

    const transactionId = req.params.transactionId;
    const transactionData = chain.getTransaction(transactionId);
    res.json({
        block:transactionData.block
    });

});

//TO GET THE PARTICULAR TRANSACTIONS
router.get('/address/:address',function(req,res) {

    const address = req.params.address;
    const addressData = chain.getAddressData(address);
    res.json({
        addressData:addressData
    });

});


module.exports = router;



FROM alpeware/chrome-headless-trunk

ENV NVM_VERSION v0.33.8
ENV NVM_DIR /root/.nvm
ENV NODE_VERSION 8.9.4
ENV NODE_PATH  $NVM_DIR/versions/node/v$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

RUN apt-get update && apt-get install -y curl vim nano && \
    curl https://raw.githubusercontent.com/creationix/nvm/$NVM_VERSION/install.sh | bash && \
    . $NVM_DIR/nvm.sh && \
    nvm install $NODE_VERSION && \
    npm install -g chrome-har-capturer

COPY ./start.sh /

ENTRYPOINT ["/start.sh"]

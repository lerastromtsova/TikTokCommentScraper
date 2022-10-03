with ({copy}) (async function() {
    let i;
    const AllCommentsXPath = '//*[contains(@class,\'DivCommentListContainer\')]';
    const level2CommentsXPath = '//*[contains(@class,\'DivReplyContainer\')]';

    const publisherProfileUrlXPath = '//*[contains(@class,\'StyledLink\') and contains(@class,\'tiktok\')]';
    const nicknameAndTimePublishedAgoXPath = '//*[contains(@data-e2e,\'browser-nickname\')]';

    const likeCountXPath = '//*[contains(@data-e2e,\'like-count\')]';
    const descriptionXPath = '//*[contains(@data-e2e,\'browse-video-desc\')]';
    const tiktokNumberOfCommentsXPath = '//*[contains(@data-e2e,\'comment-count\')]';

    const readMoreDivXPath = '//*[contains(@data-e2e,\'view-more\')]';

    // more reliable than querySelector
    function getElementsByXPath(xpath, parent)
    {
        let results = [];
        let query = document.evaluate(xpath, parent || document,
            null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for (let i = 0, length = query.snapshotLength; i < length; ++i) {
            results.push(query.snapshotItem(i));
        }
        return results;
    }

    function getAllComments(){
        return getElementsByXPath(AllCommentsXPath)[0].children;
    }

    function quoteString(s) {
        return '"' + String(s).replaceAll('"', '""') + '"';
    }

    function formatDate(strDate) {
        let f;
        if (typeof strDate !== 'undefined' && strDate !== null) {
            f = strDate.split('-');
            if (f.length === 1) {
                return strDate;
            } else if (f.length === 2) {
                return f[1] + '-' + f[0] + '-' + (new Date().getFullYear());
            } else if (f.length === 3) {
                return f[2] + '-' + f[1] + '-' + f[0];
            } else {
                return 'Malformed Date';
            }
        } else {
            return 'No date';
        }
    }

    function csvFromComment(comment) {
        let nickname = getElementsByXPath('./div[1]/a', comment)[0].outerText;
        let user = getElementsByXPath('./a', comment)[0]['href'].split('?')[0].split('/')[3].slice(1);
        let commentText = getElementsByXPath('./div[1]/p', comment)[0].outerText;
        let timeCommentedAgo = formatDate(getElementsByXPath('./div[1]/p[2]/span', comment)[0].outerText);
        let commentLikesCount = getElementsByXPath('./div[2]', comment)[0].outerText;
        let pic = getElementsByXPath('./a/span/img', comment)[0]['src'];
        return quoteString(nickname) + ',' + quoteString(user) + ',' + 'https://example.com' + ',' + quoteString(commentText) + ',' + timeCommentedAgo + ',' + commentLikesCount + ',' + quoteString(pic);
    }

    // Loading 1st level comments
    let loadingCommentsBuffer = 30; // increase buffer if loading comments takes long and the loop break too soon
    let numOfCommentsBeforeScroll = getAllComments().length;
    let allComments;
    let lastComment;
    let numOfCommentsAfterScroll;
    while (loadingCommentsBuffer > 0) {

        allComments = getAllComments();
        lastComment = allComments[allComments.length - 1];
        // Scroll last element into view = scrolling to bottom of comment page
        lastComment.scrollIntoView(false);

        numOfCommentsAfterScroll = getAllComments().length;

        // If number of comments doesn't change after 15 iterations, break the loop.
        if (numOfCommentsAfterScroll !== numOfCommentsBeforeScroll) {
            loadingCommentsBuffer = 15;
        } else {
            loadingCommentsBuffer--;
        }

        numOfCommentsBeforeScroll = numOfCommentsAfterScroll;
        console.log('Loading 1st level comment number ' + numOfCommentsAfterScroll);

        // Wait 0.3 seconds.
        await new Promise(r => setTimeout(r, 300));
    }
    console.log('Opened all 1st level comments');


    // Loading 2nd level comments
    loadingCommentsBuffer = 5; // increase buffer if loading comments takes long and the loop break too soon
    let readMoreDivs;
    while (loadingCommentsBuffer > 0) {
        readMoreDivs = getElementsByXPath(readMoreDivXPath);
        for (i = 0; i < readMoreDivs.length; i++) {
            readMoreDivs[i].click()
        }

        await new Promise(r => setTimeout(r, 500));
        if (readMoreDivs.length === 0) {
            loadingCommentsBuffer--;
        } else {
            loadingCommentsBuffer = 5;
        }
        console.log('Buffer ' + loadingCommentsBuffer);
    }
    console.log('Opened all 2nd level comments');


    // Reading all comments, extracting and converting the data to csv
    const comments = getAllComments();

    const publisherProfileUrl = getElementsByXPath(publisherProfileUrlXPath)[2]['href'];
    const nicknameAndPublishedAgoTime = getElementsByXPath(nicknameAndTimePublishedAgoXPath)[0].outerText.replaceAll('\n', ' ').split(' · ');
    const level2commentsLength = getElementsByXPath(level2CommentsXPath).length;

    const commentNumberDifference = Math.abs(getElementsByXPath(tiktokNumberOfCommentsXPath)[0].outerText - (comments.length + level2commentsLength));


    let csv = 'Now,' + Date() + '\n';
    csv += 'Post URL,' + window.location.href.split('?')[0] + '\n';
    csv += 'Publisher Nickname,' + nicknameAndPublishedAgoTime[0] + '\n';
    csv += 'Publisher URL,' + publisherProfileUrl + '\n';
    csv += 'Publisher @,' + publisherProfileUrl.split('/')[3].slice(1) + '\n';
    csv += 'Publish Time,' + formatDate(nicknameAndPublishedAgoTime[1]) + '\n'; // jsx removable
    csv += 'Post Likes,' + getElementsByXPath(likeCountXPath)[0].outerText + '\n'; // jsx removable
    csv += 'Description,' + quoteString(getElementsByXPath(descriptionXPath)[0].outerText) + '\n';
    csv += 'Number of 1st level comments,' + comments.length + '\n';
    csv += 'Number of 2nd level comments,' + level2commentsLength + '\n';
    csv += '"Total Comments (actual, in this list, rendered in the comment section (needs all comments to be loaded!))",' + (comments.length + level2commentsLength) + '\n';
    csv += "Total Comments (which TikTok tells you; it's too high most of the time when dealing with many comments OR way too low because TikTok limits the number of comments to prevent scraping)," + getElementsByXPath(tiktokNumberOfCommentsXPath)[0].outerText + '\n';
    csv += "Difference," + commentNumberDifference + '\n';
    csv += 'Comment Number (ID),Nickname,User @,User URL,Comment Text,Time,Likes,Profile Picture URL,Is 2nd Level Comment,Replied To,Number of replies\n';
    let count = 1;

    let level1comment;
    let more;
    let numberOfReplies;
    let repliedTo;
    for (i = 0; i < comments.length; i++) {
        level1comment = comments[i].children[0]
        more = comments[i].children[1]
        if (typeof more !== 'undefined') {
            more = [...more.children].slice(0, -1);
            numberOfReplies = more.length;
        } else {
            numberOfReplies = 0;
        }
        csv += count + ',' + csvFromComment(level1comment) + ',No,---,' + numberOfReplies + '\n';
        repliedTo = getElementsByXPath('./a', level1comment)[0]['href'].split('?')[0].split('/')[3].slice(1);
        for (let j = 0; j < numberOfReplies; j++) {
            count++;
            csv += count + ',' + csvFromComment(more[j]) + ',Yes,' + repliedTo + ',---\n';
        }
        count++;
    }
    const apparentCommentNumber = getElementsByXPath(tiktokNumberOfCommentsXPath)[0].outerText;
    console.log('Number of magically missing comments (not rendered in the comment section): ' + (apparentCommentNumber - count + 1) + ' (you have ' + (count - 1) + ' of ' + apparentCommentNumber + ')');
    console.log('CSV copied to clipboard!');

    copy(csv);
})()

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

const CommentXPath = '//*[contains(@class,\'DivCommentItemContainer\')]';
const Comment2ndLevelXPath = '//*[contains(@class,\'DivReplyContainer\')]';
const ReplyBtnPath = '//*[contains(@data-e2e,\'view-more-1\')]'

let comments1stlevel = [];

while (comments1stlevel.length < 50) {
    let comments1stlevel = getElementsByXPath(CommentXPath)
    console.log(comments1stlevel.length)
    let replyBtns = getElementsByXPath(ReplyBtnPath)
    for (const btn of replyBtns) {
        btn.click()
    }
    let comments2ndlevel = getElementsByXPath(Comment2ndLevelXPath)
    comments1stlevel[comments1stlevel.length-1].scrollIntoView()
}


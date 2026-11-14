import { Fragment, useMemo } from 'react';
import { type Inline, parseReply } from '../replyFormat';
import styles from './Chat.module.css';

function InlineContent({ items }: { items: Inline[] }) {
  return (
    <>
      {items.map((item, index) => {
        switch (item.type) {
          case 'text':
            return <Fragment key={index}>{item.text}</Fragment>;
          case 'price':
            return (
              <span key={index} className={styles.price}>
                {item.text}
              </span>
            );
          case 'strong':
            return (
              <strong key={index}>
                <InlineContent items={item.children} />
              </strong>
            );
        }
      })}
    </>
  );
}

/** Assistant answer rendered from a parsed structure; never as raw HTML. */
export function ReplyContent({ text }: { text: string }) {
  const blocks = useMemo(() => parseReply(text), [text]);

  return (
    <div className={styles.reply}>
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'heading':
            return (
              <p key={index} className={styles.replyHeading}>
                <InlineContent items={block.content} />
              </p>
            );
          case 'paragraph':
            return (
              <p key={index}>
                {block.lines.map((line, lineIndex) => (
                  <Fragment key={lineIndex}>
                    {lineIndex > 0 && <br />}
                    <InlineContent items={line} />
                  </Fragment>
                ))}
              </p>
            );
          case 'list': {
            const List = block.ordered ? 'ol' : 'ul';
            return (
              <List key={index} className={styles.replyList}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <InlineContent items={item} />
                  </li>
                ))}
              </List>
            );
          }
        }
      })}
    </div>
  );
}
